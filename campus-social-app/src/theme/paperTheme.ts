import { MD3Theme } from "react-native-paper";

import { createPaperTheme, getThemeByName, DEFAULT_THEME } from "../constants/themes";

const paperTheme: MD3Theme = createPaperTheme(getThemeByName(DEFAULT_THEME));

export default paperTheme;
