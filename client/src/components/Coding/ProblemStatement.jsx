export default function ProblemStatement({ problem }) {
  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6 min-h-0">
      <p className="font-dm text-sm text-white/70 leading-relaxed m-0 whitespace-pre-wrap">
        {problem?.description || "Retrieving directives…"}
      </p>
    </div>
  );
}
