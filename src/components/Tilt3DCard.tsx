"use client";

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Tilt3DCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    href?: string;
    target?: string;
    disabled?: boolean;
}

export default function Tilt3DCard({ children, className = '', onClick, href, target, disabled = false }: Tilt3DCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 350, damping: 25 });
    const mouseYSpring = useSpring(y, { stiffness: 350, damping: 25 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7deg', '-7deg']);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7deg', '7deg']);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        setMousePos({ x: mouseX, y: mouseY });
        x.set(mouseX / rect.width - 0.5);
        y.set(mouseY / rect.height - 0.5);
    };

    const handleMouseEnter = () => {
        if (!disabled) setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    const cardContent = (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={disabled ? undefined : {
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
            }}
            whileHover={disabled ? undefined : { scale: 1.02 }}
            whileTap={disabled ? undefined : { scale: 0.98 }}
            className={`luxury-tile ${disabled ? 'cursor-grab active:cursor-grabbing select-none' : ''} ${className}`}
            onClick={onClick}
        >
            {!disabled && (
                <div 
                    className="spotlight-glow"
                    style={{
                        opacity: isHovered ? 1 : 0,
                        background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.12), transparent 70%)`
                    }}
                />
            )}

            <div style={disabled ? undefined : { transform: 'translateZ(24px)' }} className="w-full h-full relative z-10">
                {children}
            </div>
            
            {!disabled && <div className="luxury-sheen" />}
        </motion.div>
    );

    if (href && !disabled) {
        return (
            <a href={href} target={target} rel="noopener noreferrer" className="block perspective-container">
                {cardContent}
            </a>
        );
    }

    return <div className="perspective-container">{cardContent}</div>;
}