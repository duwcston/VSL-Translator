import { Github, Mail } from "lucide-react";

const linkClass =
  "rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-4 text-sm text-slate-500 sm:flex-row">
        <span>© {currentYear} ASL Translator · Thesis Project at HCMIU</span>
        <div className="flex gap-3">
          <a
            href="https://github.com/duwcston/VSL-Detection"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label="GitHub repository"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="mailto:dtoan.nguyen03@gmail.com"
            className={linkClass}
            aria-label="Email"
          >
            <Mail className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
