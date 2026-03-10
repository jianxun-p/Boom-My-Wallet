import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../style.css';

export function PrivacyPolicy() {

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', lineHeight: '1.6', color: '#4a5568', fontFamily: 'sans-serif' }}>
            <header style={{ borderBottom: '2px solid #edf2f7', marginBottom: '2rem', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#111827', margin: '0' }}>Privacy Policy</h1>
                <p style={{ color: '#718096', marginTop: '0.5rem' }}>Last Updated: March 10, 2026</p>
            </header>

            <section>
                <h2>1. Introduction</h2>
                <p>
                    <strong>Boom My Wallet</strong> respects your privacy and is committed to protecting it through this Privacy Policy. 
                    This policy explains how we collect, use, and safeguard your information when you visit our website at 
                    <a href='https://boommywallet.shimaodexibao.dpdns.org' style={{ color: '#3182ce', textDecoration: 'none', marginLeft: '4px' }}>
                        boommywallet.shimaodexibao.dpdns.org
                    </a>.
                </p>
            </section>

            <section>
                <h2>2. Information We Collect</h2>
                <h3 style={{ fontWeight: '600' }}>Personal Information</h3>
                <ul>
                    <li>Full name and email address</li>
                    <li>Phone number and billing information</li>
                    <li>Account login credentials</li>
                </ul>

                <h3 style={{ fontWeight: '600', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Technical Data</h3>
                <ul>
                    <li>IP address and browser specifications</li>
                    <li>Device metadata and usage patterns</li>
                    <li>Cookies and tracking pixels</li>
                </ul>
            </section>

            <section>
                <h2>3. How We Use Your Information</h2>
                <p>We use your data to provide a seamless experience, including:</p>
                <ul>
                    <li>Processing secure transactions</li>
                    <li>Improving website performance and security</li>
                    <li>Communicating essential service updates</li>
                    <li>Complying with legal regulatory requirements</li>
                </ul>
            </section>

            <section>
                <h2>4. Data Security & Retention</h2>
                <p>
                    We implement industry-standard technical measures to protect your data. However, please note that no method of 
                    electronic transmission is 100% secure. We retain your data only as long as necessary to fulfill the 
                    purposes outlined in this policy.
                </p>
            </section>

            <section>
                <h2>5. Your Rights</h2>
                <p>Depending on your jurisdiction, you may have the right to:</p>
                <ul>
                    <li>Access or port your personal data</li>
                    <li>Request the deletion or correction of information</li>
                    <li>Object to specific data processing activities</li>
                </ul>
            </section>

            <footer style={{ marginTop: '4rem', padding: '2rem', backgroundColor: '#ebf8ff', borderRadius: '12px', textAlign: 'center' }}>
                <h2>Contact Us</h2>
                <p>Questions? Reach out to our privacy team:</p>
                <p style={{ fontWeight: 'bold' }}>
                    Email: <a href="mailto:support@shimaodexibao.dpdns.org" style={{ color: '#3182ce' }}>support@shimaodexibao.dpdns.org</a>
                </p>
            </footer>
        </div>
    );
}


createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <PrivacyPolicy />
    </StrictMode>,
)
