"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Html, QuadraticBezierLine, useGLTF } from "@react-three/drei";

// Smart Helper: Added TypeScript types and reduced tree density
const generateForest = (startX: number, endX: number, startZ: number, endZ: number, step: number) => {
  const trees = [];
  for (let x = startX; x <= endX; x += step) {
    for (let z = startZ; z <= endZ; z += step) {
      
      // --- EXCLUSION ZONES: Don't plant trees inside these building areas! ---
      const nearReservoir = x < -5 && z < -5;
      const nearIndustry = x > 5 && z < -5;
      const nearCity = x < -5 && z > 5;
      const nearFarm = x > 5 && z > 5;
      const nearCenter = Math.abs(x) < 3 && Math.abs(z) < 3; // AI Hub
      
      // If the coordinate falls in a building zone, skip this loop step entirely
      if (nearReservoir || nearIndustry || nearCity || nearFarm || nearCenter) {
        continue; 
      }

      // Add slight randomness for a natural look
      const randomOffsetX = (Math.random() - 0.5) * (step * 0.5);
      const randomOffsetZ = (Math.random() - 0.5) * (step * 0.5);
      
      // Adjusted to match your desired scale around 0.004
      const randomScale = 0.003 + (Math.random() * 0.002); 
      
      // Changed from 0.2 to 0.6: Now only has a 40% chance to spawn a tree, thinning the forest
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

// Increased step from 1.25 to 2.0 to spread the trees further apart
const treeCoordinates = generateForest(-11, 11, -11, 11, 2.0);

const roadCoordinates = [
  { position: [0, 0.01, -8], rotation: [0, Math.PI / 2, 0] },
  { position: [4, 0.01, -8], rotation: [0, Math.PI / 2, 0] },
  { position: [-4, 0.01, -8], rotation: [0, Math.PI / 2, 0] },
];

function Facility({ 
  position, 
  color, 
  size, 
  label, 
  waterLevel, 
  maxCapacity, 
  modelPath, 
  scale = 1,
  modelOffset = 1.3,
  rotation = [0, 0, 0] // <--- 1. Add rotation prop (defaults to no rotation)
}: { 
  position: number[] | [number, number, number], 
  color: string, 
  size: [number, number, number], 
  label: string, 
  waterLevel?: number, 
  maxCapacity?: number,
  modelPath?: string,
  scale?: number,
  modelOffset?: number,
  rotation?: [number, number, number] // <--- Type definition
}) {
  const undergroundDepth = -1.2;
  const buildingBottomY = position[1] - size[1] / 2;
  const drillPipeLength = buildingBottomY - undergroundDepth;
  const drillPipeCenterY = -size[1] / 2 - (drillPipeLength / 2);

  const percentage = waterLevel !== undefined && maxCapacity ? Math.min(100, Math.max(0, (waterLevel / maxCapacity) * 100)) : null;

  const gltf = modelPath ? useGLTF(modelPath) : null;

  return (
    <group position={position as [number, number, number]}>
      {modelPath && gltf ? (
        // 2. Pass the rotation array here [x, y, z] in radians
        <primitive object={gltf.scene.clone()} scale={scale} position={[0, modelOffset, 0]} rotation={rotation} />
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
        </mesh>
      )}
      
      
      {/* Underground Drill Pipe */}
      <mesh position={[0, drillPipeCenterY, 0]}>
        <cylinderGeometry args={[0.1, 0.1, drillPipeLength, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <Antenna position={[0, size[1] / 2 + (modelPath ? 1.5 : 0), 0]} />

      <Html position={[0, size[1] / 2 + (modelPath ? 3.2 : 1.5), 0]} center zIndexRange={[100, 0]}>
        <div className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-slate-800 text-xs rounded border border-slate-300 shadow-md flex flex-col gap-1 min-w-[140px] pointer-events-none select-none">
          <div className="font-bold tracking-wider text-slate-900">{label}</div>
          {waterLevel !== undefined && (
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[10px] text-slate-600 font-semibold">
                <span>Storage:</span>
                <span className="text-blue-600">{waterLevel} L</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300" 
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

// 2. AI Control Centre (Wireless telemetry hub - Upgraded for 3D Models)
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
      
      <Antenna position={[0, size[1] / 2 + (modelPath ? 1.5 : 0), 0]} />

      <Html position={[0, size[1] / 2 + (modelPath ? 3.2 : 1.5), 0]} center zIndexRange={[100, 0]}>
        <div className="px-3 py-1 bg-white/95 backdrop-blur-md text-purple-700 text-xs font-bold tracking-wider rounded border border-purple-300 shadow-md whitespace-nowrap pointer-events-none select-none">
          {label}
        </div>
      </Html>
    </group>
  );
}

function Antenna({ position }: { position: [number, number, number] }) {
  const waveRef = useRef<any>(null);

  useFrame(() => {
    if (waveRef.current) {
      waveRef.current.scale.x += 0.05;
      waveRef.current.scale.y += 0.05;
      waveRef.current.material.opacity -= 0.015;

      if (waveRef.current.material.opacity <= 0) {
        waveRef.current.scale.set(1, 1, 1);
        waveRef.current.material.opacity = 0.8;
      }
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} />
      </mesh>
      <mesh ref={waveRef} position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.8} side={2} /> 
      </mesh>
    </group>
  );
}

function UndergroundPipe({ start, end, isFlowing }: { start: [number, number], end: [number, number], isFlowing: boolean }) {
  const lineRef = useRef<any>(null);

  useFrame(() => {
    if (isFlowing && lineRef.current && lineRef.current.material) {
      lineRef.current.material.dashOffset -= 0.06; 
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

export default function WaterSimulation() {
  const [waterLevels, setWaterLevels] = useState({
    reservoir: 5000,
    industry: 1200,
    city: 3000,
    farm: 800,
  });

  const [isFlowing, setIsFlowing] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isFlowing) {
      interval = setInterval(() => {
        setWaterLevels((prev) => {
          if (prev.industry <= 0) {
            setIsFlowing(false);
            return prev;
          }
          return {
            ...prev,
            industry: Math.max(0, prev.industry - 50),
            reservoir: prev.reservoir + 50,
          };
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isFlowing]);

  return (
    <div className="w-full h-screen bg-slate-50 relative"> 
      
      {/* UI Control & Testing Overlay */}
      <div className="absolute top-6 left-6 z-10 bg-white p-4 rounded-xl shadow-xl border border-slate-200 flex flex-col gap-3 w-80 pointer-events-auto">
        <h2 className="text-slate-800 font-bold text-sm tracking-wide">AI TELEMETRY & WATER LEVELS</h2>
        
        <button 
          onClick={() => setIsFlowing(!isFlowing)}
          className={`px-4 py-2 rounded-lg font-bold text-white transition-colors text-xs tracking-wider shadow ${isFlowing ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isFlowing ? "Halt Transfer (Reservoir -> Industry)" : "Initiate AI Transfer Route"}
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

        {/* === EXPANDED TERRAIN PLATFORM (24x24 Layout) === */}
        <group position={[0, 0, 0]}>
          <mesh receiveShadow position={[0, -1.5, 0]}>
            <boxGeometry args={[24, 3, 24]} />
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
            <planeGeometry args={[24, 24]} />
            <meshStandardMaterial color="#22c55e" roughness={0.8} metalness={0.1} />
          </mesh>
        </group>

        {/* === CENTRALIZED AI WATER ROUTING PIPELINES === */}
        {/* Route 1: Industry Park to AI Control Centre */}
        <UndergroundPipe start={[8, -8]} end={[0, 0]} isFlowing={isFlowing} /> 
        
        {/* Route 2: AI Control Centre to Municipal Reservoir */}
        <UndergroundPipe start={[0, 0]} end={[-8, -8]} isFlowing={isFlowing} /> 
        
        {/* Route 3: Urban Grid to AI Control Centre (Idle) */}
        <UndergroundPipe start={[-8, 8]} end={[0, 0]} isFlowing={false} /> 
        
        {/* Route 4: AI Control Centre to Agricultural Sector (Idle) */}
        <UndergroundPipe start={[0, 0]} end={[8, 8]} isFlowing={false} /> 

        {/* === THE ZONES (Placed at exact corners ±8) === */}
        <AIControlCentre 
          position={[0, 0.5, 0]} 
          color="#8b5cf6" 
          size={[2, 1.5, 2]} 
          label="AI CONTROL CENTRE" 
          modelPath="/models/ai_center.glb" // <-- Make sure to match your file name!
          scale={1.5} 
          modelOffset={-0.5} 
        />

        <Facility 
          position={[-8, 0.25, -8]} color="#0369a1" size={[3, 0.5, 3]} 
          label="MUNICIPAL RESERVOIR " 
          waterLevel={waterLevels.reservoir} 
          maxCapacity={10000} 
          modelPath="/models/reservoir.glb" 
          scale={3}
          modelOffset={1}
        />

        
        <Facility 
          position={[8, 0.5, -8]} color="#c2410c" size={[2.5, 1, 2.5]} 
          label="INDUSTRIAL PARK" 
          waterLevel={waterLevels.industry} 
          maxCapacity={5000} 
          modelPath="/models/industry.glb" 
          scale={2.5}
          modelOffset={-0.5} 
          rotation={[0, 3*(Math.PI/2), 0]}
        />
        
        <Facility 
          position={[-8, 0.5, 8]} color="#475569" size={[2.5, 1, 2.5]} 
          label="URBAN GRID" 
          waterLevel={waterLevels.city} 
          maxCapacity={8000} 
          modelPath="/models/city.glb" 
          scale={0.06}
          modelOffset={-0.5} 
        />
        
        <Facility 
          position={[8, 0.125, 8]} color="#15803d" size={[4, 0.25, 4]} 
          label="AGRICULTURAL SECTOR" 
          waterLevel={waterLevels.farm} 
          maxCapacity={4000} 
          modelPath="/models/farm.glb" 
          scale={0.0005}
          modelOffset={1.3}
        />

        {/* Purely decorative extra water tank */}
        <DecorativeProp 
          path="/models/reservoir.glb" // Replace with your model path
          position={[-10.75, 1.25, -8]}        // Place it wherever looks good on your land
          scale={3}                  // Adjust size
          rotation={[0, Math.PI , 0]}  // Optional rotation
        />

        <DecorativeProp 
          path="/models/reservoir.glb" // Replace with your model path
          position={[-9, 1.25, -10.75]}        // Place it wherever looks good on your land
          scale={3}                  // Adjust size
          rotation={[0, Math.PI , 0]}  // Optional rotation
        />
        {/* Render all trees dynamically */}
        {treeCoordinates.map((tree, index) => (
          <DecorativeProp 
            key={`tree-${index}`}
            path="/models/tree.glb" 
            position={tree.position as [number, number, number]} 
            scale={tree.scale} 
            rotation={tree.rotation as [number, number, number]} // <--- Add this!
          />
        ))}

        {/* Render all road segments dynamically
        {roadCoordinates.map((road, index) => (
          <DecorativeProp 
            key={`road-${index}`}
            path="/models/road_straight.glb" 
            position={road.position as [number, number, number]} 
            rotation={road.rotation as [number, number, number]} 
          />
        ))} */}
      </Canvas>
    </div>
  );
}