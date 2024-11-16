import React from 'react';
import styles from './Loader.module.css';

const Loader = () => {
    return (
        <div className={styles.loaderContainer}>
            {/* Video as smoke background */}
            <video className={styles.backgroundVideo} autoPlay loop muted>
                <source src="https://video.wixstatic.com/video/d47472_58cce06729c54ccb935886c4b3647274/1080p/mp4/file.mp4" type="video/mp4" />
            </video>
            
            <div className={styles.title}>HIGHWAY GUARDIAN</div>
            
            <div className={styles.slogan}>"Protecting the Roads, Securing the Future"</div>
            
            <img src="/assets/images/Loader_Image.gif" alt="Loading..." className={styles.loader} />
            
            <div className={styles.footer}>2024 © Highway Guardian Team</div>
        </div>
    );
};

export default Loader;
