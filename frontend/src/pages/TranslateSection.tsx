import GlossToText from "../components/Translate/GlossToText";

function TranslateSection() {
  return (
    <div className="p-4">
      <div className="mb-4 text-center">
        <h2 className="mb-1 text-2xl font-bold text-slate-900">
          Gloss to Text
        </h2>
        <p className="text-slate-500">
          Build a sign sequence and see how the sentence model turns it into
          English
        </p>
      </div>
      <GlossToText />
    </div>
  );
}

export default TranslateSection;
