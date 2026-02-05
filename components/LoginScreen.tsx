
import React, { useState, useEffect } from "react";
import { Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const storedPassword = localStorage.getItem("app_password_hash");
    if (!storedPassword) {
      setIsNewUser(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isNewUser) {
      // Create Password Mode
      if (password.length < 4) {
        setError("A senha deve ter pelo menos 4 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }
      
      // Simple base64 encoding just to obfuscate distinct text (Not high security, but effective for local privacy)
      const hash = btoa(password);
      localStorage.setItem("app_password_hash", hash);
      onLoginSuccess();
    } else {
      // Login Mode
      const storedHash = localStorage.getItem("app_password_hash");
      const currentHash = btoa(password);
      
      if (storedHash === currentHash) {
        onLoginSuccess();
      } else {
        setError("Senha incorreta.");
        setPassword("");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            {isNewUser ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isNewUser ? "Criar Acesso" : "Bem-vindo de volta"}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {isNewUser 
              ? "Defina uma senha local para proteger seus dados financeiros neste dispositivo." 
              : "Digite sua senha para acessar o Gestor de Gastos."}
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder={isNewUser ? "Crie uma senha" : "Sua senha"}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Only for new users) */}
            {isNewUser && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-xs font-bold text-slate-500 uppercase">Confirmar Senha</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="Repita a senha"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg font-medium text-center animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 group"
            >
              {isNewUser ? "Definitir Senha e Entrar" : "Desbloquear"}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition" />
            </button>
          </form>

          {!isNewUser && (
             <p className="text-center text-xs text-slate-400 mt-6">
               Esqueceu? Limpe os dados do navegador para resetar (isso apagará todos os registros).
             </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
