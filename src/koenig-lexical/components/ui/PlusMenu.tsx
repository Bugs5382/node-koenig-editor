import PlusIcon from '../../assets/icons/plus.svg?react';
import {useKoenigStrings} from '../../../additions/options';

export function PlusButton({onClick}) {
    const strings = useKoenigStrings();
    return (
        <div className="absolute left-0 top-0" data-kg-plus-button>
            <button
                aria-label={strings.menu.addCard}
                className="group relative flex size-[var(--kg-plus-size,2.2rem)] cursor-pointer items-center justify-center rounded-full border border-grey transition-all ease-linear hover:border-grey-800 dark:border-grey-800 dark:hover:border-grey-400"
                type="button"
                onClick={onClick}
            >
                <PlusIcon className="size-3 stroke-grey-800 stroke-2 dark:stroke-grey-300" />
            </button>
        </div>
    );
}

export function PlusMenu({children}) {
    return (
        <div data-kg-plus-menu>
            {children}
        </div>
    );
}
