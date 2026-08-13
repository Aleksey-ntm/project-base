"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header({ isAdmin = true, username = 'ntm-admin', fullName = '' }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const displayName = fullName || username;

    useEffect(() => {
        const updateHeaderHeight = () => {
            const header = document.getElementById('globalHeader');
            const inside = document.getElementById('headerInside');
            if (!header || !inside) return;

            let progress = window.scrollY / 150;
            if (progress > 1) progress = 1;
            if (progress < 0) progress = 0;
            
            inside.style.height = `${64 - (progress * 14)}px`;
            document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);

            const r = Math.round(244 + (255 - 244) * progress);
            const g = Math.round(246 + (255 - 246) * progress);
            const b = Math.round(248 + (255 - 248) * progress);
            header.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            header.style.borderColor = `rgba(232, 236, 239, ${1 - progress})`;
        };

        window.addEventListener('scroll', updateHeaderHeight);
        window.addEventListener('resize', updateHeaderHeight);
        updateHeaderHeight();

        const handleClickOutside = (e: any) => {
            const menu = document.getElementById('userProfileMenu');
            if (menu && !menu.contains(e.target)) setIsMenuOpen(false);
        };
        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', updateHeaderHeight);
            window.removeEventListener('resize', updateHeaderHeight);
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    return (
        <header className="global-header" id="globalHeader">
            <div className="header-inside" id="headerInside">
                <Link href="/" className="header-logo">
                    @stare13x<span>.space</span>
                </Link>
                
                <div className="header-nav">
                    <a href="https://corp.server-uniofweb.ru/stream/" target="_blank" className="header-btn-main header-btn-bitrix">
                        <i className="bi bi-briefcase"></i> Перейти в Битрикс
                    </a>

                    <Link href="/" className="header-btn-main">На главную</Link>
                    
                    <div className={`user-profile-menu ${isMenuOpen ? 'active' : ''}`} id="userProfileMenu">
                        <div className="env-badge" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}>
                            <i className="bi bi-person-circle"></i> {displayName}
                        </div>
                        <div className="dropdown-wrapper">
                            <div className="dropdown-menu">
                                <div style={{ padding: '6px 10px 10px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: '6px' }}>
                                    {fullName ? (
                                        <>
                                            <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700, lineHeight: 1.2 }}>{fullName}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>@{username}</div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700, lineHeight: 1.2 }}>{username}</div>
                                    )}
                                    
                                    <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 800, padding: '2px 6px', background: isAdmin ? '#dbeafe' : '#f1f5f9', color: isAdmin ? '#1e40af' : '#475569', borderRadius: '4px', marginTop: '6px', textTransform: 'uppercase' }}>
                                        {isAdmin ? 'Администратор' : 'Пользователь'}
                                    </span>
                                </div>

                                {isAdmin && (
                                    <Link href="/users_admin" className="dropdown-item-menu dropdown-item-admin">
                                        <i className="bi bi-shield-lock"></i> Панель управления
                                    </Link>
                                )}

                                <a href="/login?logout=1" className="dropdown-item-menu dropdown-item-logout">
                                    <i className="bi bi-box-arrow-right"></i> Выйти
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}