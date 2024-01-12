import MarkdownEditor from "@/components/Editor";

export default function Home() {
  return (
    <main className="bg-white w-full h-screen">
      <div className="w-full h-full overflow-hidden">
        <MarkdownEditor />
      </div>
    </main>
  );
}
