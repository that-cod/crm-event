export interface ShiftInputProps {
    value: number;
    onChange: (value: number) => void;
}

export default function ShiftInput({ value, onChange }: ShiftInputProps) {
    const shiftOptions = [0, 0.5, 1, 1.5, 2];

    const getBgColor = (val: number) => {
        if (val === 0) return "bg-red-100";
        if (val === 0.5) return "bg-orange-100";
        if (val === 1) return "bg-green-100";
        if (val >= 1.5) return "bg-blue-100";
        return "bg-white";
    };

    return (
        <select
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className={`w-full px-1 py-1 text-center border-0 text-sm font-medium ${getBgColor(
                value
            )}`}
        >
            {shiftOptions.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
    );
}
