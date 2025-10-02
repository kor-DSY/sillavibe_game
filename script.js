document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 (이전과 동일)
    const scoreElement = document.getElementById('score');
    const gapLabelElement = document.querySelector('.gap-label');
    const gapScoreElement = document.querySelector('.gap-score');
    const rankingList = document.getElementById('ranking-list');
    const resetTimerElement = document.getElementById('reset-timer');
    const gameBoard = document.getElementById('game-board');
    const timerElement = document.getElementById('timer');
    const comboElement = document.getElementById('combo');
    const comboGaugeContainer = document.getElementById('combo-gauge-container');
    const comboGauge = document.getElementById('combo-gauge');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalScoreElement = document.getElementById('final-score');
    const playerNameInput = document.getElementById('player-name');
    const saveScoreButton = document.getElementById('save-score-button');
    const dontSaveButton = document.getElementById('dont-save-button');
    const restartButton = document.getElementById('restart-button');

    // 게임 설정 및 상태 변수들 (이전과 동일)
    const boardSize = 8, initialTime = 60, maxCombo = 10, comboTimeout = 5000, MAX_LEADERBOARD_ENTRIES = 10;
    const gemImages = ['img/j1.png', 'img/j2.png', 'img/j3.png', 'img/j4.png'];
    let board = [], score = 0, timeLeft = initialTime, selectedGem = null, timerId, combo = 0, comboTimerId = null, isGameActive = false;

    // --- 랭킹 및 초기화 시스템 (이전과 동일) --- //
    function checkAndHandleReset() {
        const now = new Date();
        const currentHour = now.getHours();
        const lastResetHour = localStorage.getItem('lastResetHour');
        if (lastResetHour === null || parseInt(lastResetHour) !== currentHour) {
            localStorage.removeItem('gemGameLeaderboard');
            localStorage.setItem('lastResetHour', currentHour);
            updateLeaderboardDisplay();
        }
    }

    function updateResetCountdown() {
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);
        const diff = nextHour - now;
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        resetTimerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        if (minutes === 59 && seconds === 59) {
            checkAndHandleReset();
        }
    }

    function loadLeaderboard() {
        const leaderboardJSON = localStorage.getItem('gemGameLeaderboard');
        return leaderboardJSON ? JSON.parse(leaderboardJSON) : [];
    }

    function saveLeaderboard(leaderboard) {
        localStorage.setItem('gemGameLeaderboard', JSON.stringify(leaderboard));
    }

    function updateLeaderboardDisplay() {
        const leaderboard = loadLeaderboard();
        rankingList.innerHTML = '';
        leaderboard.forEach((entry, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.score}</span>`;
            rankingList.appendChild(li);
        });
        updateGapToFirst();
    }

    function updateGapToFirst() {
        const leaderboard = loadLeaderboard();
        gapLabelElement.classList.remove('hidden');
        if (leaderboard.length > 0) {
            const topScore = leaderboard[0].score;
            const gap = topScore - score;
            if (gap > 0) {
                gapLabelElement.textContent = '1위까지';
                gapScoreElement.textContent = `${gap.toLocaleString()}점`;
            } else {
                gapLabelElement.textContent = '현재';
                gapScoreElement.textContent = '🎉 1위 달성!';
            }
        } else {
            gapLabelElement.textContent = '랭킹에 도전하세요!';
            gapScoreElement.textContent = '첫 득점자!';
        }
    }

    function showRestartButton() {
        playerNameInput.classList.add('hidden');
        saveScoreButton.classList.add('hidden');
        dontSaveButton.classList.add('hidden');
        restartButton.classList.remove('hidden');
    }

    function handleSaveScore() {
        const playerName = playerNameInput.value.trim();
        if (!playerName) { alert('이름을 입력해주세요!'); return; }
        const leaderboard = loadLeaderboard();
        leaderboard.push({ name: playerName, score: score });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard.splice(MAX_LEADERBOARD_ENTRIES);
        saveLeaderboard(leaderboard);
        updateLeaderboardDisplay();
        showRestartButton();
    }

    // --- 게임 로직 (checkForMatches 수정됨) --- //
    function startGame() {
        score = 0;
        timeLeft = initialTime;
        combo = 0;
        selectedGem = null;
        isGameActive = true;

        clearInterval(timerId);
        clearTimeout(comboTimerId);

        scoreElement.textContent = score;
        timerElement.textContent = timeLeft;
        comboElement.textContent = combo;
        updateGapToFirst();
        
        gameOverOverlay.classList.add('hidden');
        playerNameInput.classList.remove('hidden');
        playerNameInput.value = '';
        saveScoreButton.classList.remove('hidden');
        dontSaveButton.classList.remove('hidden');
        restartButton.classList.add('hidden');

        comboGaugeContainer.classList.add('hidden');
        comboGauge.classList.remove('running');
        
        gameBoard.innerHTML = '';
        board = [];

        createBoard();
        checkForInitialMatches();
        timerId = setInterval(updateTimer, 1000);
    }

    function createBoard() {
        for (let i = 0; i < boardSize * boardSize; i++) {
            const gem = document.createElement('div');
            gem.classList.add('gem');
            const imageIndex = Math.floor(Math.random() * gemImages.length);
            gem.style.backgroundImage = `url('${gemImages[imageIndex]}')`;
            gem.dataset.image = gemImages[imageIndex];
            gem.dataset.id = i;
            gem.addEventListener('click', onGemClick);
            gameBoard.appendChild(gem);
            board.push(gem);
        }
    }

    function updateTimer() {
        timeLeft--;
        timerElement.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }

    function endGame() {
        isGameActive = false;
        clearInterval(timerId);
        clearTimeout(comboTimerId);
        finalScoreElement.textContent = score;
        gameOverOverlay.classList.remove('hidden');
        board.forEach(gem => gem.style.pointerEvents = 'none');
    }

    function onGemClick(e) {
        if (!isGameActive) return;
        const clickedGem = e.target;
        if (!selectedGem) {
            selectedGem = clickedGem;
            selectedGem.classList.add('selected');
        } else {
            const firstGemId = parseInt(selectedGem.dataset.id), secondGemId = parseInt(clickedGem.dataset.id);
            if (firstGemId === secondGemId) {
                selectedGem.classList.remove('selected');
                selectedGem = null;
                return;
            }
            const isAdjacent = Math.abs(firstGemId - secondGemId) === 1 || Math.abs(firstGemId - secondGemId) === boardSize;
            if (isAdjacent) {
                swapGems(selectedGem, clickedGem);
                board.forEach(gem => gem.style.pointerEvents = 'none');
                setTimeout(() => {
                    if (!checkForMatches()) swapGems(clickedGem, selectedGem);
                    selectedGem.classList.remove('selected');
                    selectedGem = null;
                    if (isGameActive) board.forEach(gem => gem.style.pointerEvents = 'auto');
                }, 300);
            } else {
                selectedGem.classList.remove('selected');
                selectedGem = clickedGem;
                selectedGem.classList.add('selected');
            }
        }
    }

    function swapGems(gem1, gem2) {
        const tempImage = gem1.style.backgroundImage;
        gem1.style.backgroundImage = gem2.style.backgroundImage;
        gem2.style.backgroundImage = tempImage;
        const tempImageData = gem1.dataset.image;
        gem1.dataset.image = gem2.dataset.image;
        gem2.dataset.image = tempImageData;
    }

    function checkForInitialMatches() {
        let hasMatch = true;
        while (hasMatch) {
            hasMatch = false;
            if (checkForMatches(true)) {
                hasMatch = true;
                fillBoard();
            }
        }
    }

    function resetCombo() {
        combo = 0;
        comboElement.textContent = combo;
        comboGaugeContainer.classList.add('hidden');
        comboGauge.classList.remove('running');
    }

    // 매치 확인 로직 수정
    function checkForMatches(isInitial = false) {
        const gemsToRemove = new Set();

        // 가로/세로 4개 이상 매치를 먼저 확인하고 처리
        // 가로
        for (let i = 0; i < boardSize; i++) {
            for (let j = 0; j < boardSize - 3; j++) {
                let match = [board[i*boardSize+j], board[i*boardSize+j+1], board[i*boardSize+j+2], board[i*boardSize+j+3]];
                if (match.every(gem => gem.dataset.image === match[0].dataset.image && gem.style.backgroundImage !== 'none')) {
                    for (let k = 0; k < boardSize; k++) {
                        gemsToRemove.add(board[i * boardSize + k]);
                    }
                }
            }
        }
        // 세로
        for (let j = 0; j < boardSize; j++) {
            for (let i = 0; i < boardSize - 3; i++) {
                let match = [board[i*boardSize+j], board[(i+1)*boardSize+j], board[(i+2)*boardSize+j], board[(i+3)*boardSize+j]];
                if (match.every(gem => gem.dataset.image === match[0].dataset.image && gem.style.backgroundImage !== 'none')) {
                    for (let k = 0; k < boardSize; k++) {
                        gemsToRemove.add(board[k * boardSize + j]);
                    }
                }
            }
        }

        // 3개 매치 확인 (4개 매치로 인해 이미 지워질 보석은 제외)
        if (gemsToRemove.size === 0) {
            // 가로
            for (let i = 0; i < boardSize; i++) {
                for (let j = 0; j < boardSize - 2; j++) {
                    let match = [board[i*boardSize+j], board[i*boardSize+j+1], board[i*boardSize+j+2]];
                    if (match.every(gem => gem.dataset.image === match[0].dataset.image && gem.style.backgroundImage !== 'none')) {
                        match.forEach(gem => gemsToRemove.add(gem));
                    }
                }
            }
            // 세로
            for (let j = 0; j < boardSize; j++) {
                for (let i = 0; i < boardSize - 2; i++) {
                    let match = [board[i*boardSize+j], board[(i+1)*boardSize+j], board[(i+2)*boardSize+j]];
                    if (match.every(gem => gem.dataset.image === match[0].dataset.image && gem.style.backgroundImage !== 'none')) {
                        match.forEach(gem => gemsToRemove.add(gem));
                    }
                }
            }
        }

        if (gemsToRemove.size > 0) {
            if (!isInitial) {
                clearTimeout(comboTimerId);
                combo = Math.min(combo + 1, maxCombo);
                const comboBonus = combo * 10;
                score += (gemsToRemove.size * 10) + comboBonus;
                scoreElement.textContent = score;
                comboElement.textContent = combo;
                updateGapToFirst();

                comboGaugeContainer.classList.remove('hidden');
                comboGauge.classList.remove('running');
                void comboGauge.offsetWidth; // Reflow
                comboGauge.classList.add('running');
                comboTimerId = setTimeout(resetCombo, comboTimeout);
            }
            gemsToRemove.forEach(gem => { gem.style.backgroundImage = 'none'; gem.dataset.image = ''; });
            setTimeout(shiftAndFill, 300);
            return true;
        }
        return false;
    }

    function shiftAndFill() {
        shiftGemsDown();
        fillBoard();
        if (isGameActive) checkForMatches();
    }

    function shiftGemsDown() {
        for (let j = 0; j < boardSize; j++) {
            let emptyRow = -1;
            for (let i = boardSize - 1; i >= 0; i--) {
                const index = i * boardSize + j;
                if (board[index].style.backgroundImage === 'none' && emptyRow === -1) emptyRow = i;
                if (board[index].style.backgroundImage !== 'none' && emptyRow !== -1) {
                    swapGems(board[index], board[emptyRow * boardSize + j]);
                    emptyRow--;
                }
            }
        }
    }

    function fillBoard() {
        for (let i = 0; i < boardSize * boardSize; i++) {
            if (board[i].style.backgroundImage === 'none') {
                const imageIndex = Math.floor(Math.random() * gemImages.length);
                board[i].style.backgroundImage = `url('${gemImages[imageIndex]}')`;
                board[i].dataset.image = gemImages[imageIndex];
            }
        }
    }

    // 이벤트 리스너
    restartButton.addEventListener('click', startGame);
    saveScoreButton.addEventListener('click', handleSaveScore);
    dontSaveButton.addEventListener('click', showRestartButton);

    // --- 초기화 실행 --- //
    checkAndHandleReset();
    updateLeaderboardDisplay();
    setInterval(updateResetCountdown, 1000);
    startGame();
});