var game;
// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  game = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalScoreManager);
  //evolve(10);
});

function changeGameMode() {
  if (game == null)
    return;
  game.restart();
}
