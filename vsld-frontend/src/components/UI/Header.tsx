import Button from "./Button";

export const Header = () => {
    return (
        <div className="flex flex-row items-center justify-between">
            <div>
                <h1 className="text-3xl text-[#4A90E2] inline-block font-semibold">VSL</h1>
                <h1 className="text-3xl text-[#6C6C6C] inline-block ml-2 font-semibold">Translator</h1>
            </div>
            <Button height="3" width="4" label="About Us" onClick={() => { }} />
        </div>
    )
}
