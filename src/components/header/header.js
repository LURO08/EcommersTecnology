import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase-config';
import { signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import './header.css';
import { useCart } from './CartContext';

const ADMIN_ROLE = 'Administrador'; // Constant for role comparison

function Header() {
    const { cartItems, decrementQuantity, removeFromCart , addToCart, checkout} = useCart();
    const [userName, setUserName] = useState('');
    const [rol, setRol] = useState('');
    const [cartVisible, setCartVisible] = useState(false);
    const db = getFirestore();
    const Navigator = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
                    setUserName(docSnap.data().Usuario);
                    setRol(docSnap.data().rol);
                } else {
                    console.log("No such document!");
                    setUserName(user.email || '');
                }
            } else {
                setUserName('');
                setRol('');
            }
        });

        return () => unsubscribe();
    }, [db]);

    const handleLogout = () => {
        signOut(auth).then(() => {
            console.log('User logged out successfully');
            if (Navigator) {
                Navigator('/');
            }
        }).catch((error) => {
            console.error('Logout Error:', error);
        });
    };
    
    const toggleCart = () => {
        setCartVisible(!cartVisible);
    };

    const totalItemsInCart = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <div>
            {(userName && 
                <>
        <div className="header">
            <div className="logo">
                <Link to="/home">Home</Link>
            </div>

            <div className="nav-links">
                {userName && rol === ADMIN_ROLE && (
                    <>

                      
                    
                       <div className="dropdown">
                                <a href="#">Usuarios</a>
                                <ul className="dropdown-menu">
                                    <li><Link to="/User-Register">Registrar Usuario</Link></li>
                                    <li><Link to="/usuarios">Gestion de Usuarios</Link></li>
                                </ul>
                        </div>

                        <div className="dropdown">
                                <a href="#">Productos</a>
                                <ul className="dropdown-menu">
                                    <li><Link to="/registrarProducto">Registrar Producto</Link></li>
                                    <li><Link to="/Productos">Gestion de Productos</Link></li>
                                    <li>  <Link to="/estadisticas">Estadisticas</Link></li>
                                </ul>
                        </div>

                        <div className="dropdown">
                                <a href="#">Ventas</a>
                                <ul className="dropdown-menu">
                                    <li><Link to="/Ventas">Gestion Ventas</Link></li>
                                </ul>
                        </div>

                    </>
                )}

                <a onClick={toggleCart}>
                    <img src="/img/carritoCompras2.png" alt="Carrito" width={25} height={25} />
                    <span>{totalItemsInCart}</span>
                </a>

                <div className="navUser-links">
                    <div className="dropdownUser">
                        <a href="#">{userName}</a>
                        <ul className="dropdownUser-menu">
                        <li><Link to="/profile">Perfil</Link></li>
                        <li><Link to="/" onClick={handleLogout}>Cerrar Sesión</Link></li>
                        </ul>
                    </div>
                </div>

                {cartVisible && (
                    <div className="cart-dropdown">
                        {cartItems.length > 0 ? (
                            <ul>
                                {cartItems.map(item => (
                                    <li key={item.id}>
                                        <div className="item-top">
                                            <span className="item-name">{item.name}</span>
                                            <button className="btnEliminar" onClick={() => removeFromCart(item.id)}>X</button>
                                        </div>
                                        <div className="item-bottom">
                                            <button onClick={() => addToCart(item)}>+</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => decrementQuantity(item)}>-</button>
                                        </div>
                                      
                                    </li>
                                ))}
                                  <span>Total: ${totalPrice}</span>
                            </ul>
                        ) : (
                            <p>Tu carrito está vacío</p>
                        )}
                        <button onClick={() => checkout()}>Comprar</button> {/* Agregar botón de compra */}
                    </div>
                )}
            </div>
        </div>
        </>
            )}
        </div>
    );
}

export default Header;
