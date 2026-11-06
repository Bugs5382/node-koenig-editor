import KoenigComposableEditor from './KoenigComposableEditor';
import {KoenigPreviewBar} from '../../additions/preview/PreviewBar';
import {AllDefaultPlugins} from '../plugins/AllDefaultPlugins';
import {SharedHistoryContext} from '../context/SharedHistoryContext';
import {SharedOnChangeContext} from '../context/SharedOnChangeContext';

const KoenigEditor = ({
    onChange,
    children,
    ...props
}) => {
    return (
        <SharedHistoryContext>
            <SharedOnChangeContext onChange={onChange}>
                <KoenigPreviewBar />
                <KoenigComposableEditor {...props}>
                    <AllDefaultPlugins />
                    {children}
                </KoenigComposableEditor>
            </SharedOnChangeContext>
        </SharedHistoryContext>
    );
};

export default KoenigEditor;
