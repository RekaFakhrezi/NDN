import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setMessage({ type: "error", text: "Email dan Password wajib diisi!" });
            return;
        }

        if (isRegister && password !== confirmPassword) {
            setMessage({ type: "error", text: "Konfirmasi sandi tidak cocok!" });
            return;
        }

        setLoading(true);
        setMessage({ type: "", text: "" });

        try {
            if (isRegister) {
                // PROSES SIGN UP KE SUPABASE AUTH
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;

                // SINKRONISASI KE TABEL PUBLIC.USERS (LARAVEL)
                if (data?.user) {
                    const { error: profileError } = await supabase.from("users").insert([
                        {
                            // Kita HAPUS 'id' agar auto-increment Laravel berjalan
                            name: fullName || email.split("@")[0],
                            email: email, // Masukkan email sebagai pengikat
                            role: "author",
                            password: "dari_supabase_auth", // Isi dummy password karena Laravel biasanya mewajibkan kolom ini
                        },
                    ]);

                    if (profileError) {
                        console.error("Gagal sinkron ke tabel users:", profileError.message);
                    }
                }

                // KODE YANG DIUPDATE:
                // Pesan sukses tidak lagi menyuruh user mengecek email, melainkan langsung login
                setMessage({ type: "success", text: "Pendaftaran berhasil! Silakan langsung masuk dengan akun baru Anda. 🎉" });
                setIsRegister(false); // Balik ke halaman masuk
            } else {
                // PROSES SIGN IN
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                setMessage({ type: "success", text: "Login berhasil! Mengalihkan..." });
                setTimeout(() => navigate("/"), 1500);
            }
        } catch (error) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        // BUNGKUSAN UTAMA: SPLIT SCREEN (Kiri Merah, Kanan Putih)
        <div className="min-h-screen flex flex-col md:flex-row font-sans bg-white">

            {/* ================================================== */}
            {/* SISI KIRI (MERAH MAROON) - Sembunyi di layar HP */}
            {/* ================================================== */}
            <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-[#a31d1d] text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden">

                {/* Ornamen Latar */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-bl-full"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-black opacity-10 rounded-tr-full"></div>

                {/* Logo Pojok Kiri Atas */}
                <div className="z-10 flex items-center gap-2 hover:opacity-80 transition cursor-pointer" onClick={() => navigate("/")}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                    <span className="font-serif text-3xl font-bold tracking-wider">NDN</span>
                </div>

                {/* Teks Hero Utama */}
                <div className="z-10 mt-12 lg:mt-0">
                    <h1 className="text-4xl lg:text-5xl font-serif font-bold mb-6 leading-[1.15]">
                        Suara Rakyat,<br />Berita Terpercaya
                    </h1>
                    <p className="text-red-100 mb-12 max-w-sm leading-relaxed text-sm">
                        Dedikasi untuk jurnalisme yang berintegritas, menyajikan informasi terkini dari seluruh pelosok Nusantara.
                    </p>

                    {/* Gambar Mengambang */}
                    <div className="rounded-xl overflow-hidden shadow-2xl w-4/5 max-w-md bg-black border-4 border-white/10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                        <img
                            src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=800"
                            alt="Jurnalisme"
                            className="w-full h-auto opacity-90 mix-blend-luminosity hover:mix-blend-normal transition-all"
                        />
                    </div>
                </div>

                {/* Footer Kiri */}
                <div className="text-xs text-red-200 z-10 mt-12 opacity-80">
                    © 2024 Nusantara Daily News. Semua Hak Dilindungi.
                </div>
            </div>


            {/* ================================================== */}
            {/* SISI KANAN (FORM PUTIH BERSIH) */}
            {/* ================================================== */}
            <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 lg:p-24 relative bg-white">

                {/* Tombol Back Mobile (Hanya muncul di HP) */}
                <div className="md:hidden w-full mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#a31d1d]" onClick={() => navigate("/")}>
                        <span className="font-serif text-3xl font-bold tracking-wider">NDN</span>
                    </div>
                    <Link to="/" className="text-xs font-bold text-gray-400">Kembali</Link>
                </div>

                <div className="max-w-md w-full">

                    {/* Judul Form Kanan */}
                    <div className="mb-10">
                        <h2 className="text-4xl font-serif font-bold text-gray-900 mb-3 tracking-tight">
                            {isRegister ? "Buat Akun NDN" : "Masuk ke NDN"}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {isRegister
                                ? "Lengkapi detail di bawah untuk memulai perjalanan Anda."
                                : "Silakan masukkan detail akun Anda untuk melanjutkan membaca berita pilihan."}
                        </p>
                    </div>

                    {/* Banner Notifikasi Error/Success */}
                    {message.text && (
                        <div className={`p-4 rounded-md text-sm font-semibold mb-6 border ${message.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* === FORM INPUT UTAMA === */}
                    <form onSubmit={handleAuth} className="space-y-5">

                        {isRegister && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Masukkan nama lengkap"
                                        className="w-full bg-white border border-gray-300 rounded p-3 pl-11 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828] transition"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Alamat Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@email.com"
                                    className="w-full bg-white border border-gray-300 rounded p-3 pl-11 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828] transition"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Kata Sandi</label>
                                {!isRegister && (
                                    <span className="text-[11px] font-bold text-[#a31d1d] hover:underline cursor-pointer">Lupa Sandi?</span>
                                )}
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 karakter"
                                    className="w-full bg-white border border-gray-300 rounded p-3 pl-11 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828] transition"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer">
                                    <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                </div>
                            </div>
                        </div>

                        {isRegister && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Konfirmasi Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Ulangi password"
                                        className="w-full bg-white border border-gray-300 rounded p-3 pl-11 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828] transition"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Checkbox Ingat Saya (Hanya di Login) */}
                        {!isRegister && (
                            <div className="flex items-center gap-2 pt-1">
                                <input type="checkbox" id="remember" className="w-4 h-4 rounded border-gray-300 text-[#bd2828] focus:ring-[#bd2828] cursor-pointer" />
                                <label htmlFor="remember" className="text-xs text-gray-600 cursor-pointer">Ingat saya di perangkat ini</label>
                            </div>
                        )}

                        {/* Tombol Aksi Utama */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-[#a31d1d] text-white py-3.5 rounded font-bold text-sm hover:bg-red-800 transition shadow cursor-pointer mt-4 ${loading ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                        >
                            {loading ? "Memproses..." : isRegister ? "Daftar Sekarang →" : "Masuk"}
                        </button>
                    </form>

                    {/* Pindah Mode (Login <-> Register) */}
                    <div className="text-center text-xs text-gray-500 mt-6">
                        {isRegister ? "Sudah memiliki akun? " : "Belum punya akun? "}
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setMessage({ type: "", text: "" });
                            }}
                            className="text-[#a31d1d] font-bold hover:underline cursor-pointer bg-transparent border-none"
                        >
                            {isRegister ? "Masuk di sini" : "Daftar sekarang"}
                        </button>
                    </div>

                    {/* Pembatas ATAU */}
                    <div className="relative flex items-center my-8">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink mx-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            ATAU {isRegister ? "DAFTAR" : "MASUK"} DENGAN
                        </span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    {/* Tombol Sosial Media Berdampingan */}
                    <div className="flex gap-4">
                        <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 rounded py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm cursor-pointer">
                            {/* Icon Google Simple */}
                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                            Google
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 bg-[#1877F2] rounded py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-sm cursor-pointer">
                            {/* Icon Facebook Simple */}
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            Facebook
                        </button>
                    </div>

                </div>
            </div>

        </div>
    );
}