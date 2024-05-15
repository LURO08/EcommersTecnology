import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth, deleteUser, updatePassword } from "firebase/auth"; // Importamos updatePassword
import './GestionUsuarios.css';

const auth = getAuth();

function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "users"));
                const userList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(userList);
            } catch (error) {
                console.error("Error fetching users: ", error);
                alert('Failed to fetch users!');
            }
            setLoading(false);
        };

        const unsubscribe = auth.onAuthStateChanged(user => {
            if (!user) {
                navigate('/'); // Redirecciona al usuario a la página de inicio de sesión si no está autenticado
            }
        });

        fetchUsers();

        return () => unsubscribe();
    }, [navigate]);

    const handleDeleteAccount = async (uid) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                const userToDelete = auth.currentUser;
                if (userToDelete && userToDelete.uid === uid) {
                    await deleteUser(userToDelete);
                    setUsers(users.filter(user => user.uid !== uid));
                    alert('Cuenta eliminada con éxito');
                    // Optionally sign out the user
                    auth.signOut();
                } else {
                    alert('No user logged in or wrong user.');
                }
            } catch (error) {
                console.error("Error deleting the account: ", error);
                alert('Error deleting the account. Make sure the user has recently logged in.');
            }
        }
    };

    const handleChangePassword = async (uid) => {
        const user = auth.currentUser;
        const newPassword = prompt("Enter the new password:");
        if (user && user.uid === uid && newPassword) {
            try {
                await updatePassword(user, newPassword);
                alert('Contraseña cambiada exitosamente');
            } catch (error) {
                console.error("Error changing password: ", error);
                alert('Error changing password. Please try again later.');
            }
        }
    };

    if (loading) {
        return <div className="loading">Cargando usuarios...</div>;
    }

    return (
        <div>
            <div className="user-container">
                <h2>Lista de Usuarios</h2>
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? users.map(user => (
                            <tr key={user.id}>
                                <td>{user.Usuario}</td>
                                <td>{user.email}</td>
                                <td>{user.rol}</td>
                                <td>
                                    <button onClick={() => navigate(`/edit-user/${user.id}`)}>Modificar</button>
                                    <button onClick={() => handleDeleteAccount(user.uid)}>Eliminar</button>
                                    <button onClick={() => handleChangePassword(user.uid)}>Cambiar Contraseña</button> {/* Agregamos el botón para cambiar contraseña */}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4">No users found!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default UserList;
