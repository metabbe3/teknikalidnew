export const ACHIEVEMENTS = {
  first_post: { label: "Langkah Pertama", desc: "Buat post pertama", icon: "✏️" },
  posts_10: { label: "Aktif Bicara", desc: "10 post dibuat", icon: "💬" },
  posts_50: { label: "Suaranya Mendunia", desc: "50 post dibuat", icon: "📢" },
  first_prediction: { label: "Peramal", desc: "Buat prediksi pertama", icon: "🔮" },
  predictions_10: { label: "Tepat Ramal", desc: "10 prediksi dibuat", icon: "🎯" },
  accuracy_80: { label: "Kenal Dengan", desc: "80%+ akurasi prediksi (min 5)", icon: "🏆" },
  followers_10: { label: "Populer", desc: "10 pengikut", icon: "👥" },
  followers_100: { label: "Influencer", desc: "100 pengikut", icon: "⭐" },
  daily_streak_7: { label: "Konsisten", desc: "7x klaim harian berturut", icon: "🔥" },
  portfolio_5: { label: "Diversifikasi", desc: "5 saham di portofolio", icon: "📊" },
} as const;

export type AchievementType = keyof typeof ACHIEVEMENTS;

export function getAchievementDefinition(type: string) {
  return ACHIEVEMENTS[type as AchievementType] ?? null;
}
