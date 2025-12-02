// =========================================
// グローバル変数の定義
// =========================================
let scene, camera, renderer;
let player, ground;
let obstacles = [];
let isGameRunning = false;
let isGameOver = false;
let score = 0;
let distance = 0;
let gameSpeed = 0.2;
let obstacleSpawnTimer = 0;
let obstacleSpawnInterval = 60;

// プレイヤーの状態
let playerVelocityY = 0;
let playerVelocityX = 0;
let isJumping = false;
const GRAVITY = 0.02;
const JUMP_FORCE = 0.5;
const MOVE_SPEED = 0.15;
const PLAYER_START_Y = 0.5;
const GROUND_Y = 0;

// キー入力の状態
let keys = {
    left: false,
    right: false,
    space: false
};

// =========================================
// 初期化関数
// =========================================
function init() {
    console.log('Initializing game...');
    
    // シーンの作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

    // カメラの作成
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0, 0);

    // レンダラーの作成
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // ライトの追加
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // 地面の作成
    createGround();

    // プレイヤーの作成
    createPlayer();

    // イベントリスナーの設定
    setupEventListeners();

    // アニメーションループの開始
    animate();
    
    console.log('Game initialized successfully!');
}

// =========================================
// 地面の作成
// =========================================
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(10, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x90EE90,
        roughness: 0.8
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    scene.add(ground);

    // 道路のライン
    const lineGeometry = new THREE.PlaneGeometry(0.2, 100);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    for (let i = -2; i <= 2; i += 2) {
        if (i === 0) continue;
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(i, GROUND_Y + 0.01, 0);
        scene.add(line);
    }
}

// =========================================
// プレイヤーの作成
// =========================================
function createPlayer() {
    const playerGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const playerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFF6347,
        metalness: 0.3,
        roughness: 0.4
    });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, PLAYER_START_Y, 2);
    player.castShadow = true;
    scene.add(player);
}

// =========================================
// 障害物の作成
// =========================================
function createObstacle() {
    const types = ['box', 'tall', 'wide'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let geometry;
    switch(type) {
        case 'box':
            geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            break;
        case 'tall':
            geometry = new THREE.BoxGeometry(0.6, 1.5, 0.6);
            break;
        case 'wide':
            geometry = new THREE.BoxGeometry(1.5, 0.6, 0.6);
            break;
        default:
            geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    }
    
    const material = new THREE.MeshStandardMaterial({ 
        color: Math.random() * 0xFFFFFF,
        metalness: 0.5,
        roughness: 0.5
    });
    const obstacle = new THREE.Mesh(geometry, material);
    
    // ランダムなレーン配置
    const lanes = [-3, 0, 3];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    
    obstacle.position.set(
        lane,
        geometry.parameters.height / 2,
        -20
    );
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// =========================================
// イベントリスナーの設定
// =========================================
function setupEventListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);
    
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }
}

function onKeyDown(event) {
    switch(event.code) {
        case 'ArrowLeft':
        case 'KeyA':
            keys.left = true;
            event.preventDefault();
            break;
        case 'ArrowRight':
        case 'KeyD':
            keys.right = true;
            event.preventDefault();
            break;
        case 'Space':
            if (!keys.space && !isJumping && isGameRunning) {
                keys.space = true;
                jump();
            }
            event.preventDefault();
            break;
    }
}

function onKeyUp(event) {
    switch(event.code) {
        case 'ArrowLeft':
        case 'KeyA':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            keys.right = false;
            break;
        case 'Space':
            keys.space = false;
            break;
    }
}

function onWindowResize() {
    if (!camera || !renderer) return;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// =========================================
// ゲーム開始
// =========================================
function startGame() {
    console.log('Game started!');
    
    const instructionsDiv = document.getElementById('instructions');
    if (instructionsDiv) {
        instructionsDiv.classList.add('hidden');
    }
    
    isGameRunning = true;
    isGameOver = false;
    score = 0;
    distance = 0;
    gameSpeed = 0.2;
    obstacleSpawnTimer = 0;
    
    if (player) {
        player.position.set(0, PLAYER_START_Y, 2);
    }
    playerVelocityY = 0;
    playerVelocityX = 0;
    isJumping = false;
    
    obstacles.forEach(obstacle => {
        if (obstacle && obstacle.parent) {
            scene.remove(obstacle);
        }
    });
    obstacles = [];
    
    updateUI();
}

// =========================================
// ゲームオーバー
// =========================================
function gameOver() {
    console.log('Game Over! Score:', score);
    isGameRunning = false;
    isGameOver = true;
    
    const instructionsDiv = document.getElementById('instructions');
    if (instructionsDiv) {
        instructionsDiv.innerHTML = `
            <h1>ゲームオーバー！</h1>
            <p>最終スコア: ${score}</p>
            <p>移動距離: ${distance}m</p>
            <button id="restartButton">もう一度プレイ</button>
        `;
        instructionsDiv.classList.remove('hidden');
        
        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', startGame);
        }
    }
}

// =========================================
// ジャンプ処理
// =========================================
function jump() {
    if (!isJumping && Math.abs(player.position.y - PLAYER_START_Y) < 0.1) {
        playerVelocityY = JUMP_FORCE;
        isJumping = true;
    }
}

// =========================================
// プレイヤーの更新
// =========================================
function updatePlayer() {
    if (!player || !isGameRunning) return;
    
    // 横移動
    if (keys.left) {
        playerVelocityX = -MOVE_SPEED;
    } else if (keys.right) {
        playerVelocityX = MOVE_SPEED;
    } else {
        playerVelocityX *= 0.9;
    }
    
    player.position.x += playerVelocityX;
    player.position.x = Math.max(-4, Math.min(4, player.position.x));
    
    // ジャンプと重力
    playerVelocityY -= GRAVITY;
    player.position.y += playerVelocityY;
    
    if (player.position.y <= PLAYER_START_Y) {
        player.position.y = PLAYER_START_Y;
        playerVelocityY = 0;
        isJumping = false;
    }
    
    player.rotation.z += 0.05;
}

// =========================================
// 障害物の更新
// =========================================
function updateObstacles() {
    if (!isGameRunning) return;
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        if (!obstacle) continue;
        
        obstacle.position.z += gameSpeed;
        
        if (obstacle.position.z > 5) {
            scene.remove(obstacle);
            obstacles.splice(i, 1);
            score += 10;
            continue;
        }
        
        if (checkCollision(player, obstacle)) {
            gameOver();
            return;
        }
    }
    
    obstacleSpawnTimer++;
    if (obstacleSpawnTimer >= obstacleSpawnInterval) {
        createObstacle();
        obstacleSpawnTimer = 0;
        obstacleSpawnInterval = Math.max(30, obstacleSpawnInterval - 0.5);
        gameSpeed = Math.min(0.5, gameSpeed + 0.001);
    }
}

// =========================================
// 衝突判定
// =========================================
function checkCollision(obj1, obj2) {
    if (!obj1 || !obj2) return false;
    
    const box1 = new THREE.Box3().setFromObject(obj1);
    const box2 = new THREE.Box3().setFromObject(obj2);
    
    return box1.intersectsBox(box2);
}

// =========================================
// UI更新
// =========================================
function updateUI() {
    const scoreElement = document.getElementById('score');
    const distanceElement = document.getElementById('distance');
    
    if (scoreElement) {
        scoreElement.textContent = score;
    }
    
    if (distanceElement) {
        distanceElement.textContent = distance;
    }
}

// =========================================
// ゲームループ
// =========================================
function updateGame() {
    if (!isGameRunning) return;
    
    updatePlayer();
    updateObstacles();
    
    distance = Math.floor(score / 10);
    updateUI();
}

// =========================================
// アニメーションループ
// =========================================
function animate() {
    requestAnimationFrame(animate);
    
    updateGame();
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// =========================================
// 初期化の実行
// =========================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}



