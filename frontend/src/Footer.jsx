import React from "react";

const Footer = () => {
    const footerStyles = {
        position: "relative",
        width: "100vw",
        height: "400px",
        padding: "30px",
        backgroundColor: "#1a1a2e",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: '1',
        zIndex: '900'
    };

    const containerStyles = {
        width: "100%",
        maxWidth: "1400px",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap",
        opacity: '1'
    };

    const sectionStyles = {
        flex: 1,
        minWidth: "250px",
        margin: "10px",
    };

    const titleStyles = {
        fontSize: "24px",
        fontWeight: "bold",
    };

    const descriptionStyles = {
        fontSize: "14px",
        color: "#b0b0b0",
    };

    const linkStyles = {
        color: "#00aaff",
        textDecoration: "none",
        transition: "color 0.3s",
    };

    const linkHoverStyles = {
        color: "#ffaa00",
    };

    const socialIconStyles = {
        marginRight: "15px",
        fontSize: "24px",
        textDecoration: "none",
        color: "#ffffff",
    };

    return (
        <footer style={footerStyles}>
            <div style={containerStyles}>
                {/* Branding and Description */}
                <div style={sectionStyles}>
                    <h2 style={titleStyles}>LegalBot</h2>
                    <p style={descriptionStyles}>
                        Your trusted AI-powered legal assistant for quick legal answers and form assistance.
                    </p>
                </div>

                {/* Quick Links */}
                <div style={sectionStyles}>
                    <h3>Quick Links</h3>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        <li>
                            <a href="/faq" style={linkStyles} onMouseEnter={(e) => (e.target.style.color = linkHoverStyles.color)} onMouseLeave={(e) => (e.target.style.color = linkStyles.color)}>FAQ</a>
                        </li>
                        <li>
                            <a href="/privacy-policy" style={linkStyles} onMouseEnter={(e) => (e.target.style.color = linkHoverStyles.color)} onMouseLeave={(e) => (e.target.style.color = linkStyles.color)}>Privacy Policy</a>
                        </li>
                        <li>
                            <a href="/terms-of-service" style={linkStyles} onMouseEnter={(e) => (e.target.style.color = linkHoverStyles.color)} onMouseLeave={(e) => (e.target.style.color = linkStyles.color)}>Terms of Service</a>
                        </li>
                        <li>
                            <a href="/contact" style={linkStyles} onMouseEnter={(e) => (e.target.style.color = linkHoverStyles.color)} onMouseLeave={(e) => (e.target.style.color = linkStyles.color)}>Contact Us</a>
                        </li>
                    </ul>
                </div>

                {/* Contact Information */}
                <div style={sectionStyles}>
                    <h3>Contact</h3>
                    <p>Email: support@legalbot.com</p>
                    <p>Phone: +84 (123) 456-7890</p>
                    <p>Address: </p>
                </div>

                {/* Social Media */}
                <div style={sectionStyles}>
                    <h3>Follow Us</h3>
                    <div>
                        <a href="https://github.com/" target="_blank" rel="noopener noreferrer" style={socialIconStyles} aria-label="GitHub">🐙</a>
                        {/* Official Website */}
                        <a href="https://yourwebsite.com" target="_blank" rel="noopener noreferrer" style={socialIconStyles} aria-label="Official Website">🌐</a>
                        {/* Hugging Face */}
                        <a href="https://huggingface.co/" target="_blank" rel="noopener noreferrer" style={socialIconStyles} aria-label="Hugging Face">🤗</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
