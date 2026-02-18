import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, Mail, Loader2, GanttChartSquare } from 'lucide-react';

const Login: React.FC = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (isSignUp) {
            const { error, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (error) {
                setError(error.message === 'User already registered' ? 'E-mail já cadastrado.' : error.message);
                setLoading(false);
            } else if (data.user && data.session) {
                // Auto-logged in
            } else {
                setSuccess('Conta criada! Verifique seu e-mail (caso a confirmação esteja ativa) ou tente entrar.');
                setLoading(false);
                setIsSignUp(false);
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError('Credenciais inválidas ou erro de conexão.');
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <div className="flex flex-col items-center mb-10">
                    <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-500/20 mb-4">
                        <GanttChartSquare className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">PCM SWM BRASIL</h1>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Gestão de Paradas</p>
                </div>

                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">
                        {isSignUp ? 'Criar Nova Conta' : 'Acesso ao Sistema'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    placeholder="seu@email.com"
                                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-6"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                isSignUp ? 'CADASTRAR E ENTRAR' : 'ENTRAR NO SISTEMA'
                            )}
                        </button>

                        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                    setSuccess(null);
                                }}
                                className="text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                            >
                                {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Cadastre-se'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
