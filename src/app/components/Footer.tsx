export default function Footer() {
    return (
        <footer className="global-footer mt-auto">
            <div className="footer-inside">
                <div className="copyright">
                    <span>&copy;</span> {new Date().getFullYear()} <span className="footer-brand">ntm</span>. Все права защищены.
                </div>
                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
                    Внутренняя рабочая среда
                </div>
            </div>
        </footer>
    );
}