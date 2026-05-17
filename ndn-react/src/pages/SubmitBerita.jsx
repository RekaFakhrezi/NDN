import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SubmitBerita() {
    const [title, setTitle] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [content, setContent] = useState("");

    // State baru khusus untuk menangani File Upload Gambar
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    const [categories, setCategories] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [isRlsLocked, setIsRlsLocked] = useState(false);
    const navigate = useNavigate();

    // MENARIK DATA KATEGORI ASLI UNTUK DROPDOWN
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                let { data, error } = await supabase.from("categories").select("*");
                if (error) throw error;

                if (data) {
                    setCategories(data);
                    if (data.length === 0) setIsRlsLocked(true);
                }
            } catch (error) {
                console.error("Gagal mengambil daftar kategori:", error.message);
            }
        };
        fetchCategories();
    }, []);

    // Fungsi untuk menangani saat user memilih gambar
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validasi ukuran maksimal (misal 2MB)
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: "error", text: "Ukuran gambar maksimal 2MB!" });
                return;
            }
            setImageFile(file);
            // Membuat URL sementara untuk menampilkan preview di layar
            setImagePreview(URL.createObjectURL(file));
            setMessage({ type: "", text: "" });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title || !categoryId || !content) {
            setMessage({ type: "error", text: "Wajib mengisi Judul, Kategori, dan Isi Berita!" });
            return;
        }

        setIsSubmitting(true);
        setMessage({ type: "", text: "Sedang memproses... Mohon tunggu." });

        try {
            // 1. CEK SESI USER
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            if (authError || !session) {
                throw new Error("Sesi tidak ditemukan. Kamu harus login untuk mengirim artikel.");
            }

            // 2. MENCARI ID ANGKA (BIGINT) ASLI BERDASARKAN EMAIL
            const userEmail = session.user.email;
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id")
                .eq("email", userEmail)
                .single();

            if (userError || !userData) {
                throw new Error("Profil Anda tidak ditemukan di database publik. Pastikan email sinkron.");
            }
            const realUserId = userData.id;

            // 3. PROSES UPLOAD GAMBAR KE BUCKET SUPABASE (JIKA ADA GAMBAR)
            let finalImagePath = "https://images.unsplash.com/photo-1611974782836-33d5f1639f7f?q=80&w=400"; // Fallback default

            if (imageFile) {
                // Buat nama file unik agar tidak bentrok (contoh: 171561234_abc123.jpg)
                const fileExt = imageFile.name.split('.').pop();
                const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `articles/${uniqueFileName}`; // Simpan di dalam folder articles/

                // Upload ke bucket 'Article-Image'
                const { error: uploadError } = await supabase.storage
                    .from("Article-Image")
                    .upload(filePath, imageFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    throw new Error("Gagal mengunggah gambar ke storage: " + uploadError.message);
                }

                // Jika berhasil, simpan path-nya untuk database
                finalImagePath = filePath;
            }

            // 4. INSERT DATA ARTIKEL KE DATABASE
            const { error } = await supabase
                .from("articles")
                .insert([
                    {
                        title: title,
                        content: content,
                        image: finalImagePath, // Menggunakan hasil upload gambar
                        status: "pending",
                        category_id: categoryId,
                        user_id: realUserId
                    },
                ]);

            if (error) throw error;

            setMessage({ type: "success", text: "Berita Anda beserta gambar berhasil dikirim dan masuk antrean moderasi! 🎉" });

            // Kosongkan form setelah sukses
            setTitle("");
            setCategoryId("");
            setContent("");
            setImageFile(null);
            setImagePreview("");

        } catch (error) {
            setMessage({ type: "error", text: "Error: " + error.message });

            if (error.message.includes("Sesi tidak ditemukan")) {
                setTimeout(() => navigate("/login"), 2000);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] pb-16">
            <div className="max-w-7xl mx-auto px-6 py-10">

                <h1 className="text-3xl font-serif font-bold text-[#bd2828] mb-2">
                    Bagian Cerita Anda Hari Ini
                </h1>

                <div className="bg-red-50 border-l-4 border-[#bd2828] p-4 rounded-r-md mb-6 flex items-start gap-3">
                    <span className="text-[#bd2828] font-bold text-lg">ℹ</span>
                    <div className="text-sm text-gray-700">
                        <p className="font-bold text-[#bd2828]">Artikel Anda akan ditinjau oleh tim editorial kami sebelum diterbitkan.</p>
                        <p className="opacity-90 mt-0.5">Proses moderasi biasanya memakan waktu 2-4 jam kerja. Pastikan berita Anda akurat dan objektif.</p>
                    </div>
                </div>

                {isRlsLocked && (
                    <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-md mb-6 text-sm">
                        <p className="font-bold">⚠️ Data Kategori Ditemukan 0 Baris (RLS Terkunci)</p>
                        <p className="mt-1 opacity-90">
                            Database kamu memiliki data kategori, tapi React tidak diizinkan membacanya.
                            Silakan disable RLS tabel categories di dashboard Supabase.
                        </p>
                    </div>
                )}

                {message.text && (
                    <div className={`p-4 rounded-md mb-6 text-sm font-semibold shadow-sm ${message.type === "success" ? "bg-green-100 text-green-800 border border-green-200" :
                            message.text.includes("Sedang memproses") ? "bg-blue-50 text-blue-800 border border-blue-200" :
                                "bg-red-100 text-red-800 border border-red-200"
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* FORM INPUT */}
                    <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Judul Berita *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Masukkan judul berita yang informatif dan menarik..."
                                className="w-full bg-white border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori Berita *</label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828] text-gray-600"
                            >
                                <option value="">Pilih Kategori</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* AREA UPLOAD GAMBAR BARU */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unggah Gambar Utama (Opsional)</label>
                            <div className="relative border-2 border-dashed border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 transition cursor-pointer flex flex-col items-center justify-center p-6 min-h-[160px] overflow-hidden">
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg, image/webp"
                                    onChange={handleImageChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />

                                {imagePreview ? (
                                    <div className="flex flex-col items-center z-0 w-full h-full">
                                        <img src={imagePreview} alt="Preview" className="h-40 w-auto object-contain rounded mb-3 shadow-sm border border-gray-200" />
                                        <span className="text-xs font-bold text-[#bd2828] bg-white px-3 py-1 rounded-full shadow-sm">Ganti Gambar</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-500 z-0">
                                        <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        <p className="text-sm font-medium text-gray-700">Klik atau Drag & Drop gambar ke sini</p>
                                        <p className="text-xs mt-1">Format: JPG, JPEG, PNG (Maks. 2MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Isi Berita *</label>
                            <div className="border border-gray-300 rounded-t-md bg-gray-50 p-2 flex gap-4 border-b-0 text-sm font-bold text-gray-500">
                                <span className="cursor-not-allowed opacity-50">B</span>
                                <span className="cursor-not-allowed opacity-50 font-serif italic">I</span>
                                <span className="cursor-not-allowed opacity-50 underline">U</span>
                                <span>|</span>
                                <span className="text-xs text-gray-400 font-normal">Standard Text Editor Mode</span>
                            </div>
                            <textarea
                                rows="10"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Tuliskan berita lengkap Anda di sini secara objektif dan mendalam..."
                                className="w-full bg-white border border-gray-300 rounded-b-md py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828] focus:border-[#bd2828] resize-none"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`bg-[#bd2828] text-white px-6 py-3 rounded hover:bg-red-800 transition flex items-center gap-2 font-bold text-sm shadow-md cursor-pointer ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                        >
                            {isSubmitting ? "Sedang Mengunggah & Mengirim..." : "Kirim Berita ✈"}
                        </button>

                    </form>

                    {/* ASIDE PANDUAN */}
                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-serif font-bold text-lg text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
                                📖 Panduan Penulisan
                            </h3>
                            <ol className="text-xs text-gray-600 space-y-4 list-decimal pl-4 leading-relaxed">
                                <li><strong className="text-gray-800">5W+1H:</strong> Pastikan berita mengandung Unsur What, Who, When, Where, Why, dan How.</li>
                                <li><strong className="text-gray-800">Verifikasi:</strong> Selalu cek fakta dari minimal dua sumber independen yang kredibel.</li>
                                <li><strong className="text-gray-800">Bahasa:</strong> Gunakan Bahasa Indonesia yang baik dan benar sesuai PUEBI.</li>
                            </ol>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-serif font-bold text-lg text-gray-900 border-b pb-3 mb-4 flex items-center gap-2">
                                🛡️ Etika Jurnalistik
                            </h3>
                            <p className="text-xs italic text-gray-500 mb-4 leading-relaxed">
                                "Kebebasan pers harus disertai dengan tanggung jawab moral kepada masyarakat."
                            </p>
                            <ul className="text-xs text-gray-600 space-y-2.5">
                                <li className="flex items-center gap-2 text-green-700">✓ <span className="text-gray-600">Tidak memuat konten SARA atau hoaks.</span></li>
                                <li className="flex items-center gap-2 text-green-700">✓ <span className="text-gray-600">Menghormati privasi narasumber.</span></li>
                                <li className="flex items-center gap-2 text-green-700">✓ <span className="text-gray-600">Objektif dan tidak memihak.</span></li>
                            </ul>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}