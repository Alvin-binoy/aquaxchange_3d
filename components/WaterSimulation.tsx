"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Html, QuadraticBezierLine, useGLTF } from "@react-three/drei";

// 1. Define roads FIRST
const roadCoordinates = [
  { position: [-10, 0.01, -13], rotation: [0, Math.PI / 2, 0] },
  { position: [-5, 0.01, -13], rotation: [0, Math.PI / 2, 0] },
  { position: [0, 0.01, -13], rotation: [0, Math.PI / 2, 0] },
  { position: [5, 0.01, -13], rotation: [0, Math.PI / 2, 0] },
  { position: [10, 0.01, -13], rotation: [0, Math.PI / 2, 0] },

  { position: [11.65, 0.01, -10], rotation: [0, Math.PI , 0] },
  { position: [11.65, 0.01, -5], rotation: [0, Math.PI , 0] },
  { position: [11.65, 0.01, 0], rotation: [0, Math.PI , 0] },
  { position: [11.65, 0.01, 5], rotation: [0, Math.PI , 0] },
  { position: [11.65, 0.01, 10], rotation: [0, Math.PI , 0] },
  
  { position: [10, 0.01, 13], rotation: [0, Math.PI /2, 0] },
  { position: [5, 0.01, 13], rotation: [0, Math.PI /2, 0] },
  { position: [0, 0.01, 13], rotation: [0, Math.PI /2, 0] },
  { position: [-5, 0.01, 13], rotation: [0, Math.PI /2, 0] },
  { position: [-10, 0.01, 13], rotation: [0, Math.PI /2, 0] },

  { position: [-12.65, 0.01, 11.35], rotation: [0, Math.PI, 0] },
  { position: [-12.65, 0.01, 6.35], rotation: [0, Math.PI, 0] },
  { position: [-12.65, 0.01, 1.35], rotation: [0, Math.PI, 0] },
  { position: [-12.65, 0.01, -3.35], rotation: [0, Math.PI, 0] },
  { position: [-12.65, 0.01, -8.35], rotation: [0, Math.PI, 0] },
  { position: [-12.65, 0.01, -11.35], rotation: [0, Math.PI, 0] },

  { position: [-10.5, 0.01, 0.35], rotation: [0, Math.PI/2, 0] },
  { position: [-5.5, 0.01, 0.35], rotation: [0, Math.PI/2, 0] },

  { position: [-3.5, 0.01, 0.35], rotation: [0, Math.PI, 0] },
  { position: [-3.5, 0.01, 0.35], rotation: [0, Math.PI, 0] },
  { position: [-1.85, 0.01, -3], rotation: [0, Math.PI/2, 0] },
  { position: [0, 0.01, -3], rotation: [0, Math.PI/2, 0] },
  { position: [3, 0.01, -1.35], rotation: [0, Math.PI, 0] },

  { position: [0, 0.01, -5], rotation: [0, Math.PI, 0] },
  { position: [0, 0.01, -10], rotation: [0, Math.PI, 0] },

  { position: [3, 0.01, 0.35], rotation: [0, Math.PI, 0] },

  { position: [1.35, 0.01, 3.75], rotation: [0, Math.PI/2, 0] },
  { position: [5, 0.01, 0], rotation: [0, Math.PI/2, 0] },
  { position: [10, 0.01, 0], rotation: [0, Math.PI/2, 0] },

  { position: [-1.85, 0.01, 3.75], rotation: [0, Math.PI/2, 0] },

  { position: [0, 0.01, 5.5], rotation: [0, Math.PI, 0] },
  { position: [0, 0.01, 10.5], rotation: [0, Math.PI, 0] },
];

// 2. Define generateForest SECOND so it can read the road coordinates
const generateForest = (startX: number, endX: number, startZ: number, endZ: number, step: number) => {
  const trees = [];
  for (let x = startX; x <= endX; x += step) {
    for (let z = startZ; z <= endZ; z += step) {
      
      // --- EXCLUSION ZONES ---
      const nearReservoir = x < -5 && z < -5;
      const nearIndustry = x > 5 && z < -5;
      const nearCity = x < -5 && z > 5;
      const nearFarm = x > 5 && z > 5;
      const nearCenter = Math.abs(x) < 3 && Math.abs(z) < 3; // AI Hub
      
      // Smart Check: Loop through all custom roads. If a tree is too close (< 2.5 units), flag it.
      let onRoad = false;
      for (const road of roadCoordinates) {
        if (Math.abs(x - road.position[0]) < 2.5 && Math.abs(z - road.position[2]) < 2.5) {
          onRoad = true;
          break; // Stop checking once we know it's on a road
        }
      }
      
      if (nearReservoir || nearIndustry || nearCity || nearFarm || nearCenter || onRoad) {
        continue; 
      }

      // Add slight randomness for a natural look
      const randomOffsetX = (Math.random() - 0.5) * (step * 0.5);
      const randomOffsetZ = (Math.random() - 0.5) * (step * 0.5);
      
      const randomScale = 0.003 + (Math.random() * 0.002); 
      
      // 40% chance to spawn a tree
      if (Math.random() > 0.5) {
        trees.push({
          position: [x + randomOffsetX, 0.01, z + randomOffsetZ],
          scale: randomScale,
          rotation: [0, Math.random() * Math.PI, 0] 
        });
      }
    }
  }
  return trees;
};

// Generates trees across the wider 32x32 land
const treeCoordinates = generateForest(-14, 14, -14, 14, 2.0);

function Facility({ 
  position, 
  color, 
  size, 
  label, 
  waterLevel, 
  maxCapacity,
  minThreshold, 
  modelPath, 
  scale = 1,
  modelOffset = 1.3,
  rotation = [0, 0, 0] 
}: { 
  position: number[] | [number, number, number], 
  color: string, 
  size: [number, number, number], 
  label: string, 
  waterLevel?: number, 
  maxCapacity?: number,
  minThreshold?: number,
  modelPath?: string,
  scale?: number,
  modelOffset?: number,
  rotation?: [number, number, number] 
}) {
  const undergroundDepth = -1.2;
  const buildingBottomY = position[1] - size[1] / 2;
  const drillPipeLength = buildingBottomY - undergroundDepth;
  const drillPipeCenterY = -size[1] / 2 - (drillPipeLength / 2);

  const percentage = waterLevel !== undefined && maxCapacity ? Math.min(100, Math.max(0, (waterLevel / maxCapacity) * 100)) : null;
  
  // Check if water is at or below the minimum threshold
  const isCriticallyLow = minThreshold !== undefined && waterLevel !== undefined && waterLevel <= minThreshold;
  const barColor = isCriticallyLow ? "bg-red-500" : "bg-[#00e5ff]";
  const textColor = isCriticallyLow ? "text-red-400" : "text-[#00e5ff]";

  const gltf = modelPath ? useGLTF(modelPath) : null;

  return (
    <group position={position as [number, number, number]}>
      {modelPath && gltf ? (
        <primitive object={gltf.scene.clone()} scale={scale} position={[0, modelOffset, 0]} rotation={rotation} />
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
        </mesh>
      )}
      
      <mesh position={[0, drillPipeCenterY, 0]}>
        <cylinderGeometry args={[0.1, 0.1, drillPipeLength, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* RAISED & GLASSY LABEL */}
      <Html position={[0, size[1] / 2 + (modelPath ? 4.5 : 3.5), 0]} center zIndexRange={[100, 0]}>
        <div className="px-4 py-2.5 bg-white/30 backdrop-blur-md text-white text-xs rounded-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col gap-1.5 min-w-[140px] pointer-events-none select-none">
          <div className="font-extrabold tracking-wider">{label}</div>
          {waterLevel !== undefined && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] text-white/90 font-semibold tracking-wide">
                <span>Storage:</span>
                <span className={`${textColor} font-bold`}>{waterLevel} L</span>
              </div>
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`${barColor} h-full transition-all duration-300`} 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function AIControlCentre({ 
  position, 
  color, 
  size, 
  label,
  modelPath,
  scale = 1,
  modelOffset = 0,
  rotation = [0, 0, 0]
}: { 
  position: number[] | [number, number, number], 
  color: string, 
  size: [number, number, number], 
  label: string,
  modelPath?: string,
  scale?: number,
  modelOffset?: number,
  rotation?: [number, number, number]
}) {
  const gltf = modelPath ? useGLTF(modelPath) : null;

  return (
    <group position={position as [number, number, number]}>
      {modelPath && gltf ? (
        <primitive object={gltf.scene.clone()} scale={scale} position={[0, modelOffset, 0]} rotation={rotation} />
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
        </mesh>
      )}
      
      {/* RAISED & GLASSY LABEL */}
      <Html position={[0, size[1] / 2 + 3.5, 0]} center zIndexRange={[100, 0]}>
        <div className="px-5 py-2 bg-white/30 backdrop-blur-md text-white text-xs font-extrabold tracking-widest rounded-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.2)] whitespace-nowrap pointer-events-none select-none">
          {label}
        </div>
      </Html>
    </group>
  );
}

function UndergroundPipe({ start, end, isFlowing, isSender }: { start: [number, number], end: [number, number], isFlowing: boolean, isSender?: boolean }) {
  const lineRef = useRef<any>(null);

  useFrame(() => {
    if (isFlowing && lineRef.current && lineRef.current.material) {
      // Senders flow inward (subtract), Receivers flow outward (add)
      lineRef.current.material.dashOffset += isSender ? -0.06 : 0.06;
    }
  });

  const depth = -1.2; 
  const start3D: [number, number, number] = [start[0], depth, start[1]];
  const end3D: [number, number, number] = [end[0], depth, end[1]];
  
  const curve = useMemo(() => new THREE.LineCurve3(
    new THREE.Vector3(...start3D),
    new THREE.Vector3(...end3D)
  ), [start[0], start[1], end[0], end[1]]);

  const pipeColor = isFlowing ? "#0ea5e9" : "#22c55e";

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 20, 0.16, 8, false]} />
        <meshPhysicalMaterial 
          color="#94a3b8" 
          transparent={true} 
          opacity={0.3} 
          transmission={0.8} 
          roughness={0.1} 
          depthWrite={false} 
        />
      </mesh>

      <QuadraticBezierLine
        ref={lineRef}
        start={start3D}
        end={end3D}
        mid={[(start[0] + end[0]) / 2, depth, (start[1] + end[1]) / 2]} 
        color={pipeColor}
        lineWidth={7}       
        dashed={true}
        dashScale={12}      
        dashSize={5}
        dashOffset={0}
      />
    </group>
  );
}

function DecorativeProp({ 
  path, 
  position, 
  scale = 1, 
  rotation = [0, 0, 0] 
}: { 
  path: string, 
  position: [number, number, number], 
  scale?: number, 
  rotation?: [number, number, number] 
}) {
  const gltf = useGLTF(path);
  return <primitive object={gltf.scene.clone()} scale={scale} position={position} rotation={rotation} />;
}

function MovingTruck({ 
  start, 
  end, 
  speed = 0.04, 
  modelPath="/models/car.glb", 
  scale = 0.004, 
  rotation = [0, 0, 0] 
}: { 
  start: [number, number, number], 
  end: [number, number, number], 
  speed?: number, 
  modelPath?: string, 
  scale?: number, 
  rotation?: [number, number, number] 
}) {
  const truckRef = useRef<any>(null);
  const gltf = modelPath ? useGLTF(modelPath) : null;

  // Calculate the movement direction vector once
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const totalDistance = Math.sqrt(dx * dx + dz * dz);
  const dirX = dx / totalDistance;
  const dirZ = dz / totalDistance;

  // useFrame runs every frame (60fps) to animate the truck
  useFrame(() => {
    if (truckRef.current) {
      // Move the truck
      truckRef.current.position.x += dirX * speed;
      truckRef.current.position.z += dirZ * speed;

      // Calculate how far it has driven
      const traveled = Math.sqrt(
        Math.pow(truckRef.current.position.x - start[0], 2) + 
        Math.pow(truckRef.current.position.z - start[2], 2)
      );

      // If it reaches the end point, teleport it back to the start
      if (traveled >= totalDistance) {
        truckRef.current.position.x = start[0];
        truckRef.current.position.z = start[2];
      }
    }
  });

  return (
    <group ref={truckRef} position={start} rotation={rotation as [number, number, number]}>
      {modelPath && gltf ? (
        <primitive object={gltf.scene.clone()} scale={scale} />
      ) : (
        // Fallback procedural truck (so you can test it immediately without a .glb)
        <group position={[0, 0.25, 0]}>
          {/* Truck Cab */}
          <mesh position={[0.4, 0, 0]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#0ea5e9" roughness={0.3} />
          </mesh>
          {/* Truck Trailer */}
          <mesh position={[-0.2, 0.1, 0]} castShadow>
            <boxGeometry args={[0.8, 0.6, 0.35]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.5} />
          </mesh>
          {/* Wheels */}
          <mesh position={[0.4, -0.2, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0.4, -0.2, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[-0.4, -0.2, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[-0.4, -0.2, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function WaterSimulation() {
  // Scaled down initial state to fit the new 82L/100L limits
  const [waterLevels, setWaterLevels] = useState({
    reservoir: 100,
    industry: 50,
    city: 60,
    farm: 40,
  });

  // Track the user's dropdown choices and amount
  const [routeConfig, setRouteConfig] = useState({ source: "industry", dest: "city" });
  const [transferAmount, setTransferAmount] = useState(20);
  
  // Track the actively flowing transfer
  const [activeTransfer, setActiveTransfer] = useState<{ source: string, dest: string } | null>(null);
  
  // Track how much water has been pumped in the current active transfer
  const transferredSoFar = useRef(0);

  useEffect(() => {
    if (!activeTransfer) return;

    // 1. Halt if we successfully pumped the requested amount
    if (transferredSoFar.current >= transferAmount) {
      setActiveTransfer(null);
      return;
    }

    const src = activeTransfer.source as keyof typeof waterLevels;
    const dst = activeTransfer.dest as keyof typeof waterLevels;
    const getMaxCapacity = (key: string) => (key === "reservoir" ? 100 : 82);

    // 2. Halt if source empties or destination hits max capacity
    if (waterLevels[src] <= 0 || waterLevels[dst] >= getMaxCapacity(dst)) {
      setActiveTransfer(null);
      return;
    }

    // 3. Schedule the next single transfer tick
    const timer = setTimeout(() => {
      // Safely increment outside of the state updater function
      transferredSoFar.current += 1;
      
      setWaterLevels((prev) => ({
        ...prev,
        [src]: prev[src] - 1,
        [dst]: prev[dst] + 1,
      }));
    }, 150); // Speed of water transfer

    return () => clearTimeout(timer);
  }, [activeTransfer, transferAmount, waterLevels]);

  // Helper functions to pass the correct booleans to the UndergroundPipe components
  const isFlowing = (key: string) => activeTransfer?.source === key || activeTransfer?.dest === key;
  const isSender = (key: string) => activeTransfer?.source === key;

  return (
    <div className="w-full h-screen bg-slate-950 relative"> 
      
      <div className="absolute top-6 left-6 z-10 bg-white p-4 rounded-xl shadow-xl border border-slate-200 flex flex-col gap-3 w-80 pointer-events-auto">
        <h2 className="text-slate-800 font-bold text-sm tracking-wide">AI TELEMETRY & WATER LEVELS</h2>
        
        {/* === DYNAMIC ROUTING DROPDOWNS === */}
        <div className="flex gap-3 text-xs mb-1">
          <div className="flex flex-col gap-1 w-1/2">
            <label className="font-bold text-slate-500">Source Node</label>
            <select 
              className="border border-slate-200 rounded p-1.5 text-slate-700 bg-slate-50 outline-none focus:border-blue-500"
              value={routeConfig.source}
              onChange={(e) => setRouteConfig({...routeConfig, source: e.target.value})}
              disabled={!!activeTransfer}
            >
              <option value="reservoir">Reservoir North</option>
              <option value="industry">Industrial Park</option>
              <option value="city">Urban Grid</option>
              <option value="farm">Farm Sector</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 w-1/2">
            <label className="font-bold text-slate-500">Destination Node</label>
            <select 
              className="border border-slate-200 rounded p-1.5 text-slate-700 bg-slate-50 outline-none focus:border-blue-500"
              value={routeConfig.dest}
              onChange={(e) => setRouteConfig({...routeConfig, dest: e.target.value})}
              disabled={!!activeTransfer}
            >
              <option value="reservoir">Reservoir North</option>
              <option value="industry">Industrial Park</option>
              <option value="city">Urban Grid</option>
              <option value="farm">Farm Sector</option>
            </select>
          </div>
        </div>

        {/* === TRANSFER AMOUNT INPUT === */}
        <div className="flex flex-col gap-1 mb-1 text-xs">
          <label className="font-bold text-slate-500">Transfer Amount (L)</label>
          <input 
            type="number" 
            min="1"
            className="border border-slate-200 rounded p-1.5 text-slate-700 bg-slate-50 outline-none focus:border-blue-500"
            value={transferAmount}
            onChange={(e) => setTransferAmount(Number(e.target.value))}
            disabled={!!activeTransfer}
          />
        </div>

        <button 
          onClick={() => {
            if (activeTransfer) {
              setActiveTransfer(null);
            } else if (routeConfig.source !== routeConfig.dest && transferAmount > 0) {
              // Reset the transfer counter to 0 before starting a new flow
              transferredSoFar.current = 0;
              setActiveTransfer(routeConfig);
            }
          }}
          className={`px-4 py-2 mt-1 rounded-lg font-bold transition-colors text-xs tracking-wider shadow ${activeTransfer ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {activeTransfer ? "Halt Transfer" : "Initiate AI Transfer Route"}
        </button>

        <div className="border-t border-slate-100 pt-2 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-500">Manual Test Inputs (Liters):</span>
          
          <div className="flex justify-between items-center text-xs">
            <label className="text-slate-700">Reservoir:</label>
            <input 
              type="number" 
              value={waterLevels.reservoir}
              onChange={(e) => setWaterLevels({...waterLevels, reservoir: Number(e.target.value)})}
              className="w-24 px-2 py-1 border rounded text-right text-xs"
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <label className="text-slate-700">Industry:</label>
            <input 
              type="number" 
              value={waterLevels.industry}
              onChange={(e) => setWaterLevels({...waterLevels, industry: Number(e.target.value)})}
              className="w-24 px-2 py-1 border rounded text-right text-xs"
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <label className="text-slate-700">Urban Grid:</label>
            <input 
              type="number" 
              value={waterLevels.city}
              onChange={(e) => setWaterLevels({...waterLevels, city: Number(e.target.value)})}
              className="w-24 px-2 py-1 border rounded text-right text-xs"
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <label className="text-slate-700">Farm Sector:</label>
            <input 
              type="number" 
              value={waterLevels.farm}
              onChange={(e) => setWaterLevels({...waterLevels, farm: Number(e.target.value)})}
              className="w-24 px-2 py-1 border rounded text-right text-xs"
            />
          </div>
        </div>
      </div>

      <Canvas 
        camera={{ position: [20, 20, 20], fov: 38 }} 
        shadows
      >
        
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        
        <Grid renderOrder={-1} position={[0, -0.5, 0]} infiniteGrid fadeDistance={60} fadeStrength={5} cellColor="#e2e8f0" sectionColor="#cbd5e1" />

        {/* === SHRINKED TERRAIN PLATFORM (27.5 x 27.5 Layout) === */}
        <group position={[0, 0, 0]}>
          <mesh receiveShadow position={[0, -1.5, 0]}>
            {/* Reduced from 32 to 27.5 to cut off the extra outer land */}
            <boxGeometry args={[25, 3, 27.5]} />
            <meshPhysicalMaterial 
              color="#f8fafc" 
              transparent 
              opacity={0.3} 
              roughness={0.1} 
              transmission={0.9} 
              depthWrite={false} 
            />
          </mesh>

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
            {/* Reduced from 32 to 27.5 to match the box underneath */}
            <planeGeometry args={[25, 27.5]} />
            <meshStandardMaterial color="#22c55e" roughness={0.8} metalness={0.1} />
          </mesh>
        </group>

        {/* === CENTRALIZED AI WATER ROUTING PIPELINES === */}
        {/* All pipes are drawn from the Outer Node connecting inward to the AI Center [0,0] */}
        <UndergroundPipe start={[-8, -8]} end={[0, 0]} isFlowing={isFlowing('reservoir')} isSender={isSender('reservoir')} /> 
        <UndergroundPipe start={[8, -8]} end={[0, 0]} isFlowing={isFlowing('industry')} isSender={isSender('industry')} /> 
        <UndergroundPipe start={[-8, 8]} end={[0, 0]} isFlowing={isFlowing('city')} isSender={isSender('city')} /> 
        <UndergroundPipe start={[8, 8]} end={[0, 0]} isFlowing={isFlowing('farm')} isSender={isSender('farm')} /> 

        {/* === THE ZONES === */}
        <AIControlCentre 
          position={[0, 0.5, 0]} 
          color="#8b5cf6" 
          size={[2, 1.5, 2]} 
          label="AI CONTROL CENTRE" 
          modelPath="/models/ai_center.glb" 
          scale={1.5} 
          modelOffset={-0.5} 
        />

        <Facility 
          position={[-8, 0.25, -8]} color="#0369a1" size={[3, 0.5, 3]} 
          label="MUNICIPAL RESERVOIR" 
          waterLevel={waterLevels.reservoir} 
          maxCapacity={100} 
          modelPath="/models/reservoir.glb" 
          scale={3}
          modelOffset={1}
        />

        <Facility 
          position={[8, 0.5, -8]} color="#c2410c" size={[2.5, 1, 2.5]} 
          label="INDUSTRIAL PARK" 
          waterLevel={waterLevels.industry} 
          maxCapacity={82}
          minThreshold={34} 
          modelPath="/models/industry.glb" 
          scale={2.5}
          modelOffset={-0.5} 
          rotation={[0, 3*(Math.PI/2), 0]}
        />
        
        <Facility 
          position={[-8, 0.5, 8]} color="#475569" size={[2.5, 1, 2.5]} 
          label="URBAN GRID" 
          waterLevel={waterLevels.city} 
          maxCapacity={82}
          minThreshold={34} 
          modelPath="/models/city.glb" 
          scale={0.06}
          modelOffset={-0.5} 
        />
        
        <Facility 
          position={[8, 0.125, 8]} color="#15803d" size={[4, 0.25, 4]} 
          label="AGRICULTURAL SECTOR" 
          waterLevel={waterLevels.farm} 
          maxCapacity={82}
          minThreshold={34} 
          modelPath="/models/farm.glb" 
          scale={0.0005}
          modelOffset={1.3}
        />

        {/* Purely decorative extra water tanks */}
        <DecorativeProp 
          path="/models/reservoir.glb" 
          position={[-10.75, 1.25, -8]}        
          scale={3}                  
          rotation={[0, Math.PI , 0]}  
        />

        <DecorativeProp 
          path="/models/reservoir.glb" 
          position={[-9, 1.25, -10.75]}        
          scale={3}                  
          rotation={[0, Math.PI , 0]}  
        />

        {/* Dynamic Trees */}
        {treeCoordinates.map((tree, index) => (
          <DecorativeProp 
            key={`tree-${index}`}
            path="/models/tree.glb" 
            position={tree.position as [number, number, number]} 
            scale={tree.scale} 
            rotation={tree.rotation as [number, number, number]}
          />
        ))}

        {/* Dynamic Roads (Perimeter Highway) */}
        {roadCoordinates.map((road, index) => (
          <DecorativeProp 
            key={`road-${index}`}
            path="/models/road_straight.glb" 
            position={road.position as [number, number, number]} 
            rotation={road.rotation as [number, number, number]}
            scale={2} 
          />
        ))}
        {/* === MOVING VEHICLES === */}
        {/* North Road (Driving East) */}
        <MovingTruck start={[-12, 0.01, -13]} end={[12, 0.01, -13]} speed={0.06} rotation={[0, Math.PI/2 , 0]}/>
        
        {/* South Road (Driving West) */}
        <MovingTruck start={[12, 0.01, 13]} end={[-12, 0.01, 13]} speed={0.05} rotation={[0, -Math.PI /2, 0]} />
        
        {/* East Road (Driving South) */}
        <MovingTruck start={[11.65, 0.01, -12]} end={[11.65, 0.01, 12]} speed={0.07} rotation={[0, 0 , 0]} />
        
        {/* West Road (Driving North) */}
        <MovingTruck start={[-12.65, 0.01, 12]} end={[-12.65, 0.01, -12]} speed={0.04} rotation={[0, Math.PI, 0]} />
      </Canvas>
    </div>
  );
}