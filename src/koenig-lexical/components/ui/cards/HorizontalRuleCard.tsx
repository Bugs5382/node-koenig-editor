// The divider card: three centred dots (a section break, the default) or a plain line.
// Both are a separator for assistive technology; the dots are decoration only.
export function HorizontalRuleCard({variant = 'dots'}: {variant?: string}) {
    if (variant === 'line') {
        return (
            <hr
                className="m-0 block h-[1px] border-0 border-t border-grey-300"
                data-kg-section-break="line"
            />
        );
    }
    return (
        <div
            className="kg-section-break"
            data-kg-section-break="dots"
            role="separator"
        >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
        </div>
    );
}
