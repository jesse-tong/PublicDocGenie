import { useState } from "react";
import axios from "axios";

const SERVER_URL = "http://localhost:8000";

function Home() {
    const containerStyle = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "3rem",
        opacity: "1",
        zIndex: "900",
        position: "relative",
        backgroundColor: "#fff",
    };

    const headingStyle = {
        fontSize: "2rem",
        fontWeight: "bold",
        marginBottom: "1rem",
        color: "#333",
    };

    const paragraphStyle = {
        fontSize: "1rem",
        maxWidth: "600px",
        textAlign: "center",
        lineHeight: "1.5",
        color: "#555",
        marginBottom: "2rem",
    };

    const featuresContainerStyle = {
        display: "flex",
        flexDirection: "column",
        marginBottom: "2rem",
        width: "100%",
        maxWidth: "800px",
    };

    const featureItemStyle = {
        backgroundColor: "#f9f9f9",
        margin: "0.5rem 0",
        padding: "1rem",
        borderRadius: "4px",
    };

    const tabContainerStyle = {
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        marginTop: "1rem",
    };

    const tabStyle = {
        padding: "0.5rem 1rem",
        border: "1px solid #ccc",
        borderRadius: "4px",
        cursor: "pointer",
        backgroundColor: "#f9f9f9",
    };

    const formContainerStyle = {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: "400px",
        marginTop: "2rem",
        backgroundColor: "#f9f9f9",
        padding: "1rem",
        borderRadius: "4px",
    };

    const labelStyle = {
        marginBottom: "0.5rem",
        fontWeight: "bold",
    };

    const inputStyle = {
        marginBottom: "1rem",
        padding: "0.5rem",
        borderRadius: "4px",
        border: "1px solid #ccc",
    };

    const testimonialsContainerStyle = {
        marginTop: "2rem",
        width: "100%",
        maxWidth: "600px",
        textAlign: "center",
    };

    const testimonialItemStyle = {
        backgroundColor: "#f0f0f0",
        margin: "0.5rem 0",
        padding: "1rem",
        borderRadius: "4px",
    };

    const navBarStyle = {
        position: "fixed",
        bottom: "0",
        left: "0",
        width: "100%",
        backgroundColor: "#f2f2f2",
        display: "flex",
        justifyContent: "space-around",
        padding: "1rem 0",
        borderTop: "1px solid #ccc",
        zIndex: "900",
    };

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${SERVER_URL}/message`, formData);
            alert("Biểu mẫu đã được gửi");
        } catch (error) {
            console.error(error);
            alert("Đã xảy ra lỗi khi gửi biểu mẫu");
        }
    };

    return (
        <>
        <div style={containerStyle}>
            <h1 style={headingStyle}>Chào mừng bạn đến với trang web của chúng tôi</h1>
            <p style={paragraphStyle}>
                Chúng tôi cung cấp Hỏi đáp Pháp lý và hỗ trợ biểu mẫu chính phủ để giúp cuộc sống của bạn dễ dàng hơn. Hãy xem các tính năng bên dưới.
            </p>

            <div style={featuresContainerStyle}>
                <div style={featureItemStyle}>Tính năng: Câu trả lời pháp lý chuyên gia</div>
                <div style={featureItemStyle}>Tính năng: Tự động điền biểu mẫu</div>
                <div style={featureItemStyle}>Tính năng: Tải tài liệu bảo mật</div>
            </div>

            <div style={tabContainerStyle}>
                <div style={tabStyle}>Hỏi đáp Pháp lý</div>
                <div style={tabStyle}>Tự động điền biểu mẫu</div>
            </div>

            <div style={testimonialsContainerStyle}>
                <h2>Mọi người nói gì</h2>
                <div style={testimonialItemStyle}>
                    “Trang web này đã giúp tôi tiết kiệm rất nhiều thời gian với giấy tờ.”
                </div>
                <div style={testimonialItemStyle}>
                    “Phần hỏi đáp pháp lý cực kỳ hữu ích!”
                </div>
            </div>

            <form style={formContainerStyle} onSubmit={handleSubmit}>
                <label style={labelStyle} htmlFor="name">Tên</label>
                <input
                    style={inputStyle}
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                />

                <label style={labelStyle} htmlFor="email">Email</label>
                <input
                    style={inputStyle}
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                />

                <label style={labelStyle} htmlFor="message">Lời nhắn</label>
                <textarea
                    style={inputStyle}
                    id="message"
                    name="message"
                    rows="4"
                    value={formData.message}
                    onChange={handleChange}
                />

                <button type="submit">Gửi</button>
            </form>
        </div>
        <div style={navBarStyle}>
            <div>Trang chủ</div>
            <div>Tính năng</div>
            <div>Liên hệ</div>
        </div>
        </>
    );
}

export default Home;
