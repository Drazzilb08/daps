import React, { useState, useEffect } from 'react';
import '../../css/404.css';

const GRID_SIZE = 3;
const TILE_SIZE = 70; // px; sync with CSS
const GAP = 8; // px; sync with CSS

const TILES = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);

function getShuffledTiles() {
    let arr;
    do {
        arr = [...TILES];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    } while (!isSolvable(arr));
    return arr;
}

function isSolvable(tiles) {
    let invCount = 0;
    for (let i = 0; i < tiles.length - 1; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i] !== TILES.length - 1 && tiles[j] !== TILES.length - 1 && tiles[i] > tiles[j]) {
                invCount++;
            }
        }
    }
    return invCount % 2 === 0;
}

function getGridPos(index) {
    return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

function tileContent(val) {
    const grid = [
      '4', '0', '4',
      '',  '',  '',
      '',  '',  ''
    ];
    return grid[val] || '';
}

function isMiddle404(tiles) {
    const centerVals = [tiles[3], tiles[4], tiles[5]];
    return (
        tileContent(centerVals[0]) === '4' &&
        tileContent(centerVals[1]) === '0' &&
        tileContent(centerVals[2]) === '4'
    );
}

export default function NotFound() {
    const [tiles, setTiles] = useState(getShuffledTiles);
    const [isSolved, setIsSolved] = useState(false);
    const [invalidShake, setInvalidShake] = useState(false);
    const [moveCount, setMoveCount] = useState(0);
    const [showHint, setShowHint] = useState(false);

    const blankIndex = tiles.indexOf(TILES.length - 1);

    useEffect(() => {
        const middle404 = isMiddle404(tiles);
        if (middle404 && !isSolved) {
            setIsSolved(true);
        }
        if (!middle404 && isSolved) {
            setIsSolved(false);
        }
    }, [tiles]);

    useEffect(() => {
        if (moveCount >= 15) setShowHint(true);
    }, [moveCount]);

    function isAdjacent(i, blank) {
        const pos = getGridPos(i);
        const bpos = getGridPos(blank);
        return (Math.abs(pos.row - bpos.row) + Math.abs(pos.col - bpos.col)) === 1;
    }

    function handleTileClick(idx) {
        if (isSolved) {
            setInvalidShake(true);
            setTimeout(() => setInvalidShake(false), 400);
            return;
        }
        if (isAdjacent(idx, blankIndex)) {
            const newTiles = [...tiles];
            [newTiles[idx], newTiles[blankIndex]] = [newTiles[blankIndex], newTiles[idx]];
            setTiles(newTiles);
            setMoveCount(prev => prev + 1);
        }
    }

    function handleKeyDown(e) {
        if (isSolved) return;
        const dir = { ArrowUp: -GRID_SIZE, ArrowDown: GRID_SIZE, ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (dir !== undefined) {
            const moveIdx = blankIndex + dir;
            if (
                moveIdx >= 0 &&
                moveIdx < TILES.length &&
                (dir === -GRID_SIZE || dir === GRID_SIZE || getGridPos(moveIdx).row === getGridPos(blankIndex).row)
            ) {
                const newTiles = [...tiles];
                [newTiles[blankIndex], newTiles[moveIdx]] = [newTiles[moveIdx], newTiles[blankIndex]];
                setTiles(newTiles);
                setMoveCount(prev => prev + 1);
            }
        }
    }

    function handleReset() {
        setTiles(getShuffledTiles());
        setIsSolved(false);
        setInvalidShake(false);
        setMoveCount(0);
        setShowHint(false);
    }

    return (
        <div className="four04puzzle__outer">
            <h1 className="four04puzzle__title">404</h1>
            <p className="four04puzzle__desc">
                Looks like you’re lost.<br />
                Slide to solve the <b>404</b> and get home!
            </p>
            <div
                className={
                    "four04puzzle__grid abs" +
                    (isSolved ? ' solved' : '') +
                    (invalidShake ? ' invalidshake' : '')
                }
                tabIndex={0}
                onKeyDown={handleKeyDown}
                aria-label="404 sliding puzzle"
                style={{
                    width: GRID_SIZE * TILE_SIZE + (GRID_SIZE - 1) * GAP,
                    height: GRID_SIZE * TILE_SIZE + (GRID_SIZE - 1) * GAP,
                }}
            >
                {tiles.map((val, idx) => {
                    if (val === TILES.length - 1) return null; // Skip blank
                    const { row, col } = getGridPos(idx);
                    const x = col * (TILE_SIZE + GAP);
                    const y = row * (TILE_SIZE + GAP);

                    return (
                        <div
                            key={val}
                            className={
                                `four04puzzle__tile abs` +
                                (isSolved ? ' solved' : '')
                            }
                            style={{
                                transform: `translate(${x}px, ${y}px)`,
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                                position: 'absolute',
                                transition: 'transform 0.26s cubic-bezier(.62,1.8,.49,1.18), box-shadow 0.18s, background 0.18s',
                                zIndex: 2,
                            }}
                            tabIndex={0}
                            aria-label={`Tile ${val + 1}`}
                            onClick={() => handleTileClick(idx)}
                            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleTileClick(idx)}
                        >
                            <span className="four04puzzle__number">
                                {tileContent(val)}
                            </span>
                        </div>
                    );
                })}
            </div>
            {showHint && (
                <p
                    className="four04puzzle__hint"
                    style={{ color: 'var(--muted)', textAlign: 'center', marginTop: '0.8rem', fontWeight: '600' }}
                >
                    Hint: Get the center row to say <span style={{color: 'var(--primary)'}}>4 0 4</span>
                </p>
            )}
            {isSolved && (
                <p
                    className="four04puzzle__win-msg"
                    style={{
                        color: 'var(--success)',
                        textAlign: 'center',
                        marginTop: '1rem',
                        fontWeight: '700',
                        fontSize: '1.2rem'
                    }}
                    aria-live="polite"
                >
                    🎉 You solved the puzzle! Great job!
                    <br />
                    Shouldn't you be doing something else?
                </p>
            )}
            <div className="four04puzzle__controls">
                <button className="four04puzzle__reset" onClick={handleReset}>Shuffle</button>
                <a className="four04puzzle__home" href="/">Go Home</a>
            </div>
        </div>
    );
}