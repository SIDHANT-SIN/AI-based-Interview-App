export default function DiagnosticCard({ title, icon, description, themeClass }) {
  if (!description) return null;
  return (
    <div className={`${themeClass.bg} ${themeClass.border} border rounded-2xl p-6 sm:p-8 backdrop-blur-sm`}>
      <h4 className={`font-orbitron text-sm font-bold uppercase tracking-widest ${themeClass.text} m-0 mb-3 flex items-center gap-2`}>
        <span className="text-lg">{icon}</span> {title}
      </h4>
      <p className="font-dm text-sm text-white/70 leading-relaxed m-0">
        {description}
      </p>
    </div>
  );
}
