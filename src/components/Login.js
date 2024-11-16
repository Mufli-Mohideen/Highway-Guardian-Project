import React, { useState } from "react";
import styles from "./Login.module.css"; // Import the styles

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here, e.g., validate email and password
    console.log("Login attempt", { email, password, rememberMe });
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            <label htmlFor="rememberMe">Remember me</label>
          </div>
          <button type="submit" className={styles.button}>Sign In</button>
        </form>
        <p className={styles.footerText}>
          Don't have an account? <strong>Sign Up</strong>
        </p>
      </div>
    </div>
  );
};

export default Login;
