import { useState, useEffect } from 'react';
import './login.css';

export function Footer() {
    const ls = { color: '#3182ce' };
    return <footer className='bg-white'>
        <p><u><a href="mailto:support@shimaodexibao.dpdns.org" style={ls}>support@shimaodexibao.dpdns.org</a></u></p>
        <p><u><a href="/terms-of-service" style={ls}>Terms of Service</a></u> | <u><a href="/privacy-policy" style={ls}>Privacy Policy</a></u></p>
    </footer>;
}

export default function Login() {
	const [errMsg, setErrMsg] = useState<string>("");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setErrMsg(params.get('error') ?? "");
	}, []);

	const params = new URLSearchParams(window.location.search);
	
	const googleOauthSignIn = () => {
		if (window.top) 
			window.location.href = `${import.meta.env.VITE_API_BASE}/oauth/google/login?${params}`
	};
	
	return <>
		<div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-8 content-center">
			<div className="max-w-3xl mx-auto bg-white rounded-xl shadow-2xl p-6 sm:p-8">
			
				<h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
				Login
				</h1>
				<div>
					<p><strong>Boom My Wallet</strong> is a financial management application where YOU OWN YOUR DATA.</p>
					<p>No more manual financial logging, use Apple Shortcuts with our API endpoints.</p>
					<br />
				</div>
				<div>
					<button className="login-btn" onClick={googleOauthSignIn}>Sign-In With Google</button>
				</div>
				<Footer />
				<p className='text-red-500'>{errMsg}</p>
			</div>
		</div>
	</>;
}