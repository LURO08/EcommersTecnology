import React, { createContext, useContext, useReducer, useMemo, useEffect, useState } from 'react';
import { db } from '../../firebase-config';
import { 
    collection, 
    doc, 
    getDoc, 
    updateDoc, 
    setDoc, 
    addDoc 
} from 'firebase/firestore';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { auth } from '../../firebase-config';

const CartContext = createContext();

const cartReducer = (state, action) => {
    switch (action.type) {
        case 'SET_CART':
            return action.payload;
        case 'ADD_ITEM':
            const exist = state.find(item => item.id === action.payload.id);
            if (exist) {
                return state.map(item =>
                    item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...state, { ...action.payload, quantity: 1 }];
            }
        case 'REMOVE_ITEM':
            return state.filter(item => item.id !== action.payload.id);
        case 'INCREMENT':
            return state.map(item =>
                item.id === action.payload.id ? { ...item, quantity: Math.min(item.quantity + 1, action.payload.limit) } : item
            );
        case 'DECREMENT':
            return state.map(item =>
                item.id === action.payload.id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item
            );
        case 'CLEAR_CART':
            return [];
        default:
            return state;
    }
};

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, dispatch] = useReducer(cartReducer, []);
    const [userName, setUserName] = useState('');

    // Load cart from database
    useEffect(() => {

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
                    setUserName(docSnap.data().Usuario);
                } else {
                    console.log("No such document!");
                    setUserName(user.email || '');
                }
            } else {
                setUserName('');
            }
        });

        const fetchCart = async () => {
            try {
                const cartDoc = doc(db, "carts", "userCartId"); // Replace "userCartId" with actual user cart ID
                const cartSnapshot = await getDoc(cartDoc);
                if (cartSnapshot.exists()) {
                    const cartData = cartSnapshot.data().cartItems;
                    dispatch({ type: 'SET_CART', payload: cartData });
                }
            } catch (error) {
                console.error("Error fetching cart: ", error);
            }
        };
        fetchCart();
        return () => unsubscribe();
    }, [db]);

    // Update cart in database whenever cartItems change
    useEffect(() => {
        updateCartInDatabase(cartItems);
    }, [cartItems]);

    const updateCartInDatabase = async (cart) => {
        const total = cart.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const cartDocRef = doc(db, "carts", "userCartId"); // Replace "userCartId" with actual user cart ID
        await setDoc(cartDocRef, { cartItems: cart, total });
    };

    const updateProductQuantity = async (productId, newQuantity) => {
        const productDocRef = doc(db, 'products', productId);
        await updateDoc(productDocRef, { quantity: newQuantity });
    };

    const updateProductVentas = async (productId, newVentas) => {
        const productDocRef = doc(db, 'products', productId);
        await updateDoc(productDocRef, { ventas: newVentas });
    };

    const addToCart = async (product) => {
        const productInCart = cartItems.find(item => item.id === product.id);
        if (productInCart) {
            const productDoc = await getDoc(doc(db, "products", product.id));
            const availableQuantity = productDoc.exists() ? productDoc.data().quantity : 0;
            dispatch({ type: 'INCREMENT', payload: { id: product.id, limit: availableQuantity } });
        } else {
            dispatch({ type: 'ADD_ITEM', payload: { id: product.id, name: product.name, quantity: 1, price: product.price } });
        }
    };

    const removeFromCart = async (id) => {
        dispatch({ type: 'REMOVE_ITEM', payload: { id } });
    };

    const decrementQuantity = async (product) => {
        dispatch({ type: 'DECREMENT', payload: { id: product.id } });
    };

    const clearCart = async () => {
        dispatch({ type: 'CLEAR_CART' });
    };

    const checkout = async () => {
        try {
            const cartItemsData = cartItems.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));

            // Actualizar la cantidad de productos en la base de datos
            cartItems.forEach(async item => {
                const productDoc = await getDoc(doc(db, "products", item.id));
                const currentQuantity = productDoc.exists() ? productDoc.data().quantity : 0;
                const newQuantity = Math.max(currentQuantity - item.quantity, 0); // Asegúrate de que la cantidad no sea negativa
                await updateProductQuantity(item.id, newQuantity);

                if (productDoc.exists()) {
                    const currentVentas = productDoc.data().ventas || 0;
                    const newVentas = currentVentas + item.quantity;
                    await updateProductVentas( item.id, newVentas );
                }
            });

            await addDoc(collection(db, 'orders'), {
                items: cartItemsData,
                total: cartItems.reduce((acc, item) => acc + (item.quantity * item.price), 0),
                User:  userName,
                timestamp: new Date().toISOString()
            });

            // Crear un nuevo documento PDF
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();

            // Definir variables de posición y estilo
            const startX = 50;
            let startY = 750;
            const lineHeight = 20;
            const fontSize = 12;
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Agregar encabezado
            page.drawText('Ticket de Compra', {
                x: startX,
                y: startY,
                size: 24,
                font,
                color: rgb(0, 0, 0),
            });
            startY -= 20;

            // Agregar información sobre los artículos comprados
            const productName = 'Producto'.toString().padEnd(30); // Ajusta el ancho según sea necesario
            const productquantity = 'Cantidad'.toString().padEnd(10);
            const ProductPrice = 'Precio'.toString().padEnd(10);
            const productTotal = 'Importe'.toString().padEnd(10);
            const headers = [productName, productquantity, ProductPrice, productTotal];
            const headerText = headers.join('   ');
            page.drawText(headerText, {
                x: startX,
                y: startY,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
            });
            startY -= lineHeight-10;

            // Agregar puntos como separadores debajo de las etiquetas
            const separator = '.'.repeat(90);
            page.drawText(separator, {
                x: startX,
                y: startY,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
            });
            startY -= lineHeight-10;

         

            cartItems.forEach((item) => {
                // Dividir el nombre del producto en múltiples líneas si es demasiado largo
                const productNameLines = item.name.match(/.{1,20}/g) || []; // Dividir en líneas de 30 caracteres
                productNameLines.forEach((line, index) => {
                    const adjustedLine = line.padEnd(20); // Ajustar la longitud de la línea
                    const productquantity = index === 0 ? item.quantity.toString().padEnd(10) : ''; // Solo mostrar la cantidad en la primera línea
                    const ProductPrice = index === 0 ? item.price.toFixed(2).padEnd(10) : ''; // Solo mostrar el precio en la primera línea
                    const productTotal = index === 0 ? (item.price * item.quantity).toFixed(2).padEnd(10) : ''; // Solo mostrar el total en la primera línea
                    const text = `${adjustedLine}   ${productquantity}   ${ProductPrice}   ${productTotal}`;
                    page.drawText(text, {
                        x: startX,
                        y: startY,
                        size: fontSize,
                        font,
                        color: rgb(0, 0, 0),
                    });
                    startY -= lineHeight;
                });
            });

            
            const separator2 = '.'.repeat(90);
            page.drawText(separator2, {
                x: startX,
                y: startY,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
            });
            startY -= lineHeight;

            // Calcular y agregar el total de la compra
            const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
            page.drawText(`Total: $${total.toFixed(2)}`, {
                x: startX,
                y: startY,
                size: 22,
                font,
                color: rgb(0, 0, 0),
            });

            // Guardar el documento PDF como un blob
            const pdfBytes = await pdfDoc.save();

            // Crear un objeto Blob con los bytes del PDF
            const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

            // Crear una URL para el blob y abrirlo en una nueva ventana
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl);

            // También puedes descargar el PDF directamente
            // const pdfUrl = URL.createObjectURL(pdfBlob);
            // const a = document.createElement('a');
            // a.href = pdfUrl;
            // a.download = 'ticket.pdf';
            // a.click();

            // Actualizar la cantidad de productos en la base de datos, etc.

            // Limpiar el carrito después de realizar la compra
            clearCart();

        } catch (error) {
            console.error("Error checking out: ", error);
        }
    };

    const value = useMemo(() => ({
        cartItems,
        addToCart,
        removeFromCart,
        decrementQuantity,
        clearCart,
        checkout
    }), [cartItems]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

export default CartContext;
