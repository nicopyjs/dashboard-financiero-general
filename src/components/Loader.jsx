export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-elevated" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-blue animate-spin" />
      </div>
      <p className="text-txt-secondary text-sm font-medium tracking-wide">
        Cargando datos...
      </p>
    </div>
  )
}
