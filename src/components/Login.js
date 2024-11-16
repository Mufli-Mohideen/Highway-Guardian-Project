import React, { useState } from 'react';
import styles from './Login.module.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Import Font Awesome icons

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handleClear = () => {
    setEmail('');
    setPassword('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftContainer}></div>
      <div className={styles.rightContainer}>
        <div className={styles.rightBox}>
          <div className={styles.textBox}>
            <h1 className={styles.h1}>Login</h1>
            <h2 className={styles.h2}>Nice to see you again!</h2>
          </div>
          <div className={styles.inputContainer}>
            <input
              type="text"
              className={styles.input}
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="User ID"
            />
            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={styles.eyeButton}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <div className={styles.toggleContainer}>
            <input type="checkbox" className={styles.toggleBox} name="checkbox" />
            <label htmlFor="checkbox">Remember me</label>
          </div>
          <button className={styles.btn}>SIGN IN</button>
          <button type="button" onClick={handleClear} className={styles.clearBtn}>
            CLEAR
          </button>
        </div>
        <footer className={styles.footer}>
          <p>2024 © Highway Guardian Team All Rights Reserved</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;
