import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { GameHistory } from './scenes/GameHistory';
import { GameWin } from './scenes/GameWin';
import { MainMenu } from './scenes/MainMenu';
import { MissionBriefing } from './scenes/MissionBriefing';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { GameConfig } from './config/GameConfig';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: GameConfig.width,
    height: GameConfig.height,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scale: GameConfig.scale,
    dom: GameConfig.dom,
    physics: GameConfig.physics,
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MissionBriefing,
        MainGame,
        GameOver,
        GameWin,
        GameHistory
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
