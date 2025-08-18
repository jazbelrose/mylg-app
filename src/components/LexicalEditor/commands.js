// commands.js
import { createCommand } from 'lexical';


export const SET_TEXT_COLOR_COMMAND = createCommand('SET_TEXT_COLOR');
export const SET_BG_COLOR_COMMAND = createCommand('SET_BG_COLOR');
export const INSERT_IMAGE_COMMAND = 'INSERT_IMAGE_COMMAND';
export const SET_FONT_FAMILY_COMMAND = createCommand('SET_FONT_FAMILY');
export const SET_FONT_SIZE_COMMAND = createCommand('SET_FONT_SIZE');
export const OPEN_IMAGE_COMMAND = createCommand('OPEN_IMAGE');
export const OPEN_FIGMA_COMMAND = createCommand('OPEN_FIGMA');
export const TOGGLE_SPEECH_COMMAND = createCommand('TOGGLE_SPEECH');
