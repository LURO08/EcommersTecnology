import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();  // Extrae login del contexto
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/home');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoToRegister = () => {
    navigate('/register');  // Navega a la página de registro
  };


  return (
    <div className="login-form">
      <h1>Login</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <label>Email:</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password:</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="form-buttons">
        <button type="button" onClick={handleGoToRegister} className=" button register-btn">Register</button>
        <button type="submit"  className="button">Login</button>
        </div>
      </form>
    </div>
  );
}

export default Login;
