import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Footer from './Footer';
import anime from 'animejs';
import './Layout.css';
import DongSonDrumLogo from './assets/dong_son_drum.svg';

const navItems = [
  { name: 'Trang chủ', path: '/' },
  { name: 'Hỏi đáp pháp luật', path: '/qa' },
  { name: 'Điền tự động mẫu đơn dịch vụ công', path: '/complete-forms' },
  { name: 'Câu hỏi thường gặp', path: '/common-questions' },
  { name: 'Về chúng tôi', path: '/about' },
];

const Layout = () => {
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const offcanvasRef = useRef(null);

  const toggleOffcanvas = () => {
    setIsOffcanvasOpen((prev) => !prev);
  };

  // Run anime.js animation when offcanvas state changes
  useEffect(() => {
    if (offcanvasRef.current) {
      anime({
        targets: offcanvasRef.current,
        translateX: isOffcanvasOpen ? 0 : -380,
        duration: 500,
        easing: 'easeOutExpo',
      });
    }
  }, [isOffcanvasOpen]);

  return (
    <>
      <div className="layout">
        <div className={`floating-toggle-offcanvas ${!isOffcanvasOpen ? 'show-float-button' : 'hide-float-button menu-open'}`} 
        onClick={toggleOffcanvas}>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <nav className={`sidebar ${isOffcanvasOpen ? 'open' : ''}`} ref={offcanvasRef}>
          <div className="nav-header">
            <h2>Legal Q&A</h2>
            
          </div>
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => isActive ? 'active' : ''}
                  onClick={() => setIsOffcanvasOpen(false)} // Close menu on navigation (for mobile)
                >
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="content">
          {/* Outlets render the matched child route components */}
          <img src={DongSonDrumLogo} className='dong-son-drum'></img>
          <Outlet />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Layout;
