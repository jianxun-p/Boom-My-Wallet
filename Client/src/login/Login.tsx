import { useState, useEffect } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './login.css';


function getCookies() {
	return new Map<string, string>(
		document.cookie
		.split(/;\\s*/)
		.map(c => {
			const [k, v] = c.split('=');
			return [decodeURIComponent(k), decodeURIComponent(v)];
		})
	);
}


export function Login() {
	
	const [errMsg, setErrMsg] = useState<string>("");
	const [authuri, setAuthuri] = useState<string>("");
	
	useEffect(() => {
		const cookies = getCookies();
		const authUri = cookies.get('google_oauth_uri');
		if (!authUri) {
			window.location.href = '/oauth/google/login';
		} else if (window.top) {
			setAuthuri(authUri);
		}
	}, []);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setErrMsg(params.get('error') ?? "");
	}, []);
	
	const googleOauthSignIn = () => {
		if (window.top) 
			window.top.location.href = authuri;
	};

	
	return (
		
		<div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-8 content-center">
			<div className="max-w-3xl mx-auto bg-white rounded-xl shadow-2xl p-6 sm:p-8">
			
				<h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
				Login
				</h1>
				<div className="grid sm:grid-rows-1 sm:grid-cols-1 sm:gap-y-4 space-y-4 sm:space-y-0">
					<button className="login-btn" onClick={googleOauthSignIn}>Sign-In With Google</button>
				</div>
				<p className='text-red-500'>{errMsg}</p>
			</div>
		</div>
	);
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Login />
	</StrictMode>,
);
