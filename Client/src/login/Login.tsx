import { useState, useEffect } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './login.css';

export function Login() {
	
	const [errMsg, setErrMsg] = useState<string>("");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setErrMsg(params.get('error') ?? "");
	}, []);
	
	const googleOauthSignIn = () => {
		if (window.top) 
			window.top.location.href = '/oauth/google/login';
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
