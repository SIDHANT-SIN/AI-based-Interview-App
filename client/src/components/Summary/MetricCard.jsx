export default function MetricCard({ title, icon, items, themeClass }) {
  if (!items || items.length === 0) return null;
  
  return (
    <div className={`${themeClass.bg} ${themeClass.border} border rounded-2xl p-6 sm:p-8 backdrop-blur-sm`}>
      <h3 className={`font-orbitron text-sm sm:text-base font-bold uppercase tracking-widest ${themeClass.text} m-0 mb-5 flex items-center gap-2`}>
        <span className="text-xl">{icon}</span> {title}
      </h3>
      <ul className="list-none p-0 m-0 space-y-4">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="flex gap-3 items-start font-dm text-sm sm:text-base text-white/80"
          >
            <span className={`${themeClass.text} font-bold mt-0.5`}>
              ❯
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
