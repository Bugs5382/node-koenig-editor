import {useKoenigStrings} from '../../../additions/options';

export function EditorPlaceholder({className, text}) {
    const strings = useKoenigStrings();
    return (
        <div
            className={`pointer-events-none absolute left-0 top-0 min-w-full cursor-text font-serif text-xl text-grey-500 dark:text-grey-800 ${className}`}
        >{typeof text === 'string' ? text : strings.placeholder}</div>
    );
}
