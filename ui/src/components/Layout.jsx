// src/components/Layout.jsx
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
    return (
        <div>
            <Header />
            <Sidebar />
            <main className="container">
                <div id="viewFrame" className="view-frame" style={{ opacity: 1 }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
