import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase-config';
import { updatePassword } from 'firebase/auth';
import './Profile.css';
import { useNavigate } from 'react-router-dom';

function Profile() {
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // Estado para manejar la carga
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (!user) {
                navigate('/'); // Redirecciona al usuario a la página de inicio de sesión si no está autenticado
            }
        });

        return () => unsubscribe();
    }, [navigate]); // Agregar products como dependencia

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setLoading(true); // Iniciar carga
        try {
            await updatePassword(auth.currentUser, newPassword);
            setMessage('Contraseña cambiada correctamente');
            setLoading(false); // Finalizar carga
        } catch (error) {
            setMessage(`Error no se puedo actualizar la contraseña: ${error.message}`);
            setLoading(false); // Finalizar carga si hay un error
        }
    };

    return (
        <div className="profile-container">
            <h1>Configuración de Perfil</h1>
            <div className="form-section">
                <h2>Cambiar Contraseña</h2>
                <form onSubmit={handlePasswordChange}>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ingrese la nueva contraseña"
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Updating...' : 'Actualizar'}
                    </button>
                </form>
                {message && <p className="message">{message}</p>}
            </div>
        </div>
    );
}

export default Profile;
