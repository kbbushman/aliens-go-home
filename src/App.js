import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as Auth0 from 'auth0-web';
import io from 'socket.io-client';
import { getCanvasPosition } from './utils/formulas';
import Canvas from './components/Canvas/Canvas';

Auth0.configure({
  domain: 'kbushman.auth0.com',
  clientID: 'BS3ifjkTJFYOfgBvLoVN14nAzWR6W73p',
  redirectUri: 'http://localhost:3000/',
  responseType: 'token id_token',
  scope: 'openid profile manage:points',
  audience: 'http://kennethbushman.com/aliens-go-home',
});

class App extends Component {
  constructor(props) {
    super(props);
    this.socket = null;
    this.currentPlayer = null;
  }

  componentDidMount = () => {
    Auth0.handleAuthCallback();

    Auth0.subscribe((auth) => {
      if (!auth) return;

      this.playerProfile = Auth0.getProfile();
      this.currentPlayer = {
        id: this.playerProfile.sub,
        maxScore: 0,
        name: this.playerProfile.name,
        picture: this.playerProfile.picture,
      };

      this.props.loggedIn(this.currentPlayer);

      this.socket = io('http://localhost:3001', {
        query: `token=${Auth0.getAccessToken()}`,
      });

      this.socket.on('players', (players) => {
        this.props.leaderboardLoaded(players);
        players.forEach((player) => {
          if (player.id === this.currentPlayer.id) {
            this.currentPlayer.maxScore = player.maxScore;
          }
        });
      });
    });

    setInterval(() => {
      this.props.moveObjects(this.canvasMousePosition);
    }, 10);

    window.onresize = () => {
      const cnv = document.getElementById('aliens-go-home-canvas');
      cnv.style.width = `${window.innerWidth}px`;
      cnv.style.height = `${window.innerHeight}px`;
    };
    window.onresize();
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.gameState.started && this.props.gameState.started) {
      if (this.currentPlayer.maxScore < this.props.gameState.kills) {
        this.socket.emit('new-max-score', {
          ...this.currentPlayer,
          maxScore: this.props.gameState.kills,
        });
      }
    }
  }

  trackMouse = (event) => {
    this.canvasMousePosition = getCanvasPosition(event);
  }

  shoot = () => {
    this.props.shoot(this.canvasMousePosition);
  }

  render() {
    return (
      <Canvas
        angle={this.props.angle}
        currentPlayer={this.props.currentPlayer}
        gameState={this.props.gameState}
        players={this.props.players}
        startGame={this.props.startGame}
        trackMouse={event => (this.trackMouse(event))}
        shoot={this.shoot}
      />
    );
  }
}

App.propTypes = {
  angle: PropTypes.number.isRequired,
  gameState: PropTypes.shape({
    started: PropTypes.bool.isRequired,
    kills: PropTypes.number.isRequired,
    lives: PropTypes.number.isRequired,
    flyingObjects: PropTypes.arrayOf(PropTypes.shape({
      position: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired
      }).isRequired,
      id: PropTypes.number.isRequired,
    })).isRequired,
  }).isRequired,
  moveObjects: PropTypes.func.isRequired,
  startGame: PropTypes.func.isRequired,
  currentPlayer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    maxScore: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    picture: PropTypes.string.isRequired,
  }),
  leaderboardLoaded: PropTypes.func.isRequired,
  loggedIn: PropTypes.func.isRequired,
  players: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    maxScore: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    picture: PropTypes.string.isRequired,
  })),
  shoot: PropTypes.func.isRequired,
};

App.defaultProps = {
  currentPlayer: null,
  players: null,
};

export default App;
