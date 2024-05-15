import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import './GestionUsuarios.css';

const auth = getAuth();

function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const db = getFirestore();
    const [isReauthenticationRequired, setIsReauthenticationRequired] = useState(false);
    

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
    }, [navigate, db]);

    const handleDeleteAccount = async (uid) => {
        if (isReauthenticationRequired) {
            if (window.confirm("Are you sure you want to delete this user?")) {
                try {
                    const userToDelete = auth.currentUser;
    
                    if (userToDelete && userToDelete.uid === uid) {
                        // Eliminar el documento del usuario en Firestore
                        await deleteDoc(doc(db, "users", uid));
                        // Eliminar la cuenta de autenticación
                        await deleteUser(userToDelete);
                        setUsers(prevUsers => prevUsers.filter(user => user.id !== uid)); // Usamos prevUsers para filtrar
                        alert('User account deleted successfully');
                        auth.signOut();
                    } else {
                        alert('No user logged in or wrong user.');
                    }
                } catch (error) {
                    console.error("Error deleting user account: ", error);
                    alert('Error deleting user account.');
                }
            }
        } else {
            setIsReauthenticationRequired(true);
        }
    };
    

    const handleReauthenticate = async (password, uid) => {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, password);
        try {
            await reauthenticateWithCredential(user, credential);
            setIsReauthenticationRequired(false);
            handleDeleteAccount(uid);
        } catch (error) {
            console.error("Error reauthenticating: ", error);
            alert('Invalid password. Please try again.');
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
                                    <button onClick={() => setIsReauthenticationRequired(true)}>Eliminar</button>
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
            {isReauthenticationRequired && <ReauthenticationForm onCancel={() => setIsReauthenticationRequired(false)} onReauthenticate={(password) => handleReauthenticate(password)} />}
        </div>
    );
}

function ReauthenticationForm({ onCancel, onReauthenticate }) {
    const [password, setPassword] = useState('');

    const handleReauthenticate = () => {
        onReauthenticate(password);
    };

    return (
        <div>
            <h2>Reauthentication Required</h2>
            <label>Password:</label>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <div>
                <button onClick={handleReauthenticate}>Confirm</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}

export default UserList;
