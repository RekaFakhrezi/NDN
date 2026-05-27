import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function MyArticles() {
    const [activeTab, setActiveTab] = useState("Semua");
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const [editingArticle, setEditingArticle] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editCategoryId, setEditCategoryId] = useState("");
    const [editContent, setEditContent] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const navigate = useNavigate();

    const fetchMyArticles = async () => {
        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            if (authError || !session) {
                navigate("/login");
                return;
            }

            const userEmail = session.user.email;
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id")
                .eq("email", userEmail)
                .single();

            if (userError || !userData) return;

            const { data, error } = await supabase
                .from("articles")
                .select("*, categories(name)")
                .eq("user_id", userData.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            if (data) setArticles(data);

            const { data: catData } = await supabase.from("categories").select("*");
            if (catData) setCategories(catData);

        } catch (error) {
            console.error("Gagal menarik data:", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyArticles();
    }, [navigate]);

    const handleBanding = async (articleId) => {
        if (!window.confirm("Ajukan banding? Artikel ini akan dikirim ulang ke antrean admin untuk ditinjau.")) return;

        try {
            const { error } = await supabase.from("articles").update({ status: "pending" }).eq("id", articleId);
            if (error) throw error;
            alert("Banding berhasil diajukan! Status kembali menjadi Pending.");
            fetchMyArticles();
        } catch (error) {
            alert("Gagal mengajukan banding: " + error.message);
        }
    };

    const handleDelete = async (articleId) => {
        if (!window.confirm("Yakin ingin menghapus draf ini selamanya? Data tidak bisa dikembalikan.")) return;

        try {
            const { error } = await supabase.from("articles").delete().eq("id", articleId);
            if (error) throw error;
            fetchMyArticles();
        } catch (error) {
            alert("Gagal menghapus artikel: " + error.message);
        }
    };

    const openEditModal = (article) => {
        setEditingArticle(article);
        setEditTitle(article.title);
        setEditCategoryId(article.category_id);
        setEditContent(article.content);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editTitle || !editCategoryId || !editContent) {
            alert("Judul, kategori, dan konten wajib diisi!");
            return;
        }

        setIsSavingEdit(true);
        try {
            const { error } = await supabase
                .from("articles")
                .update({
                    title: editTitle,
                    category_id: editCategoryId,
                    content: editContent,
                    status: "pending"
                })
                .eq("id", editingArticle.id);

            if (error) throw error;

            alert("Perubahan berhasil disimpan dan telah dikirim ulang untuk moderasi!");
            setEditingArticle(null);
            fetchMyArticles();
        } catch (error) {
            alert("Gagal menyimpan perubahan: " + error.message);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const getImageUrl = (imagePath) => {
        if (!imagePath) return "https://images.unsplash.com/photo-1541876751093-68d6d67b7891?q=80&w=1200";
        if (imagePath.startsWith("http")) return imagePath;
        const cleanPath = imagePath.startsWith("articles/") ? imagePath : `articles/${imagePath}`;
        return `https://kbahpvjqnvujodhaauyn.supabase.co/storage/v1/object/public/REACT_NDN/${cleanPath}`;
    };

    const formatStatus = (dbStatus) => {
        if (dbStatus === "published" || dbStatus === "approved") return "DIPUBLIKASIKAN";
        if (dbStatus === "pending") return "PENDING";
        if (dbStatus === "rejected") return "DITOLAK";
        if (dbStatus === "archived") return "DIARSIPKAN";
        return "PENDING";
    };

    const filteredArticles = articles.filter(article => {
        if (activeTab === "Semua") return true;
        return formatStatus(article.status) === activeTab.toUpperCase();
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-t-[#bd2828] border-gray-200 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-gray-500 animate-pulse">Memuat riwayat artikel Anda...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] pb-20 pt-6 md:pt-8 font-sans relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">

                <div className="text-[10px] md:text-xs text-gray-500 mb-2 md:mb-3 tracking-wide">
                    Dashboard / <span className="font-bold text-[#bd2828]">Artikel Saya</span>
                </div>

                {/* HEADER & TOMBOL SUBMIT */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-gray-900">
                        <span className="border-b-4 border-[#bd2828] pb-1">Artikel</span> yang Saya Kirim
                    </h1>
                    {/* Tombol dibuat melebar penuh di mobile agar gampang di-tap */}
                    <Link to="/submit" className="bg-[#a31d1d] text-white px-5 py-3 md:py-2.5 rounded-md font-bold text-sm flex items-center justify-center sm:justify-start gap-2 hover:bg-red-800 transition shadow-sm w-full sm:w-max">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Submit Berita Baru
                    </Link>
                </div>

                {/* TABS NAVIGASI (Swipeable Horizontal di HP) */}
                <div className="flex overflow-x-auto whitespace-nowrap sm:flex-wrap items-center gap-2 md:gap-3 mb-6 md:mb-8 pb-2 sm:pb-0 no-scrollbar">
                    {["Semua", "Pending", "Dipublikasikan", "Ditolak"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-bold transition shadow-sm border cursor-pointer shrink-0 ${activeTab === tab ? "bg-[#a31d1d] text-white border-[#a31d1d]" : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {filteredArticles.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 md:p-12 text-center">
                        <p className="text-gray-500 text-sm md:text-base font-medium">Belum ada artikel di kategori ini.</p>
                    </div>
                ) : (
                    <div className="space-y-4 md:space-y-6">
                        {filteredArticles.map((article) => {
                            const statusUI = formatStatus(article.status);

                            return (
                                <div key={article.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row gap-4 md:gap-6 shadow-sm hover:shadow-md transition">

                                    {/* Gambar: Lebar penuh di HP, lebar fixed 72 di Desktop */}
                                    <div className="w-full md:w-72 h-40 md:h-44 shrink-0 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                        <img src={getImageUrl(article.image)} alt={article.title} className="w-full h-full object-cover" />
                                    </div>

                                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                                        <div>
                                            <div className="flex flex-wrap justify-between items-start gap-2 mb-2 md:mb-3">
                                                <span className={`text-[9px] md:text-[10px] font-extrabold px-2 py-0.5 md:px-2.5 md:py-1 rounded tracking-widest ${statusUI === "DIPUBLIKASIKAN" ? "bg-green-100 text-green-700" :
                                                    statusUI === "PENDING" ? "bg-orange-100 text-orange-700" :
                                                        statusUI === "DITOLAK" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                                                    {statusUI}
                                                </span>
                                                <span className="text-[10px] md:text-xs text-gray-500 font-medium shrink-0">
                                                    {new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 leading-snug line-clamp-2 md:pr-4">{article.title}</h3>
                                        </div>

                                        {/* Area Bottom Info & Actions (Kolom tumpuk di HP, sebar rata di Desktop) */}
                                        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end mt-4 md:mt-6 border-t border-gray-100 pt-3 md:pt-4 gap-4">

                                            {/* Info Bawah Kiri */}
                                            <div className="flex items-center gap-3 md:gap-4 text-[11px] md:text-xs font-medium text-gray-500">
                                                {statusUI === "DIPUBLIKASIKAN" && (
                                                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> {article.view_count || 0} Pembaca</span>
                                                )}
                                                {statusUI === "PENDING" && (
                                                    <span className="flex items-center gap-1.5 text-orange-600"><svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"></circle><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l4 2"></path></svg> Menunggu review admin</span>
                                                )}
                                                {statusUI === "DITOLAK" && (
                                                    <span className="flex items-center gap-1.5 text-red-600"><svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Ditolak editorial</span>
                                                )}
                                            </div>

                                            {/* Aksi Bawah Kanan (Tombol dibikin flex-wrap w-full agar luwes di layar sempit) */}
                                            <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full xl:w-auto">
                                                {statusUI === "DIPUBLIKASIKAN" && (
                                                    <Link to={`/artikel/${article.id}`} className="text-[#a31d1d] font-bold text-xs flex items-center justify-center gap-1 hover:underline w-full sm:w-auto py-2 sm:py-0 border sm:border-0 border-[#a31d1d] rounded sm:rounded-none">
                                                        Lihat <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                                    </Link>
                                                )}

                                                {statusUI === "PENDING" && (
                                                    <button onClick={() => openEditModal(article)} className="flex-1 sm:flex-none justify-center text-gray-700 font-bold text-[11px] md:text-xs flex items-center gap-1.5 hover:text-[#a31d1d] cursor-pointer bg-gray-100 px-3 py-2 md:py-1.5 rounded">
                                                        Edit Draft <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                    </button>
                                                )}

                                                {statusUI === "DITOLAK" && (
                                                    <>
                                                        <button onClick={() => handleBanding(article.id)} className="flex-1 sm:flex-none justify-center text-[#a31d1d] font-bold text-[10px] md:text-xs flex items-center gap-1 hover:underline cursor-pointer bg-red-50 sm:bg-transparent px-2 sm:px-0 py-2 sm:py-0 rounded border sm:border-0 border-red-200">
                                                            Banding <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                                                        </button>
                                                        <button onClick={() => openEditModal(article)} className="flex-1 sm:flex-none justify-center text-gray-700 font-bold text-[10px] md:text-xs flex items-center gap-1 hover:text-black cursor-pointer bg-gray-100 px-2 md:px-3 py-2 md:py-1.5 rounded">
                                                            Edit Ulang
                                                        </button>
                                                        <button onClick={() => handleDelete(article.id)} className="flex-1 sm:flex-none justify-center text-red-600 font-bold text-[10px] md:text-xs flex items-center gap-1 hover:text-red-800 cursor-pointer bg-red-50 px-2 md:px-3 py-2 md:py-1.5 rounded border border-red-200">
                                                            Hapus
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            {/* ========================================== */}
            {/* MODAL EDIT ARTIKEL OVERLAY RESPONSIVE      */}
            {/* ========================================== */}
            {editingArticle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingArticle(null)}></div>

                    <div className="relative bg-white w-full max-w-3xl max-h-[90vh] md:max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                        <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900">Revisi Artikel</h2>
                            <button onClick={() => setEditingArticle(null)} className="text-gray-400 hover:text-red-500 transition cursor-pointer p-1">
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="p-4 md:p-6 overflow-y-auto flex-1">
                            <div className="bg-blue-50 text-blue-800 text-[11px] md:text-xs p-3 rounded mb-4 md:mb-5 border border-blue-200 flex items-start sm:items-center gap-2 leading-relaxed">
                                <svg className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Menyimpan perubahan akan mengembalikan status artikel menjadi "Pending" untuk ditinjau ulang oleh Admin.</span>
                            </div>

                            <form id="editForm" onSubmit={handleSaveEdit} className="space-y-4 md:space-y-5">
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">Judul Berita</label>
                                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2.5 md:py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828]" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">Kategori</label>
                                    <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2.5 md:py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828]" required>
                                        <option value="">Pilih Kategori</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-2">Isi Konten Berita</label>
                                    <textarea rows="8" value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-3 px-3.5 md:px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#bd2828] resize-y min-h-[150px] md:min-h-[200px]" required></textarea>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer (Tombol disusun vertikal di HP, sejajar di Desktop) */}
                        <div className="p-4 md:p-5 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2 md:gap-3">
                            <button type="button" onClick={() => setEditingArticle(null)} className="w-full sm:w-auto px-5 py-2.5 md:py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded transition cursor-pointer text-center">
                                Batal
                            </button>
                            <button form="editForm" type="submit" disabled={isSavingEdit} className="w-full sm:w-auto px-5 py-2.5 md:py-2 text-sm font-bold bg-[#a31d1d] text-white hover:bg-red-800 rounded transition shadow cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSavingEdit ? "Menyimpan..." : "Simpan & Ajukan Ulang"}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}