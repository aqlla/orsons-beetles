import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js'
import { groupFaces, toJson, Vec3, Tile } from './goldberg.ts';

const sizes = [
	2, 5, 8, 11, 14, 17, 23, 29, 32, 35, 44, 56, 68, 89
]

type SphericalCoord = {
	r: number,
	phi: number,
	theta: number
}

type LatLon = {
	lat: number,
	lon: number
}

type TODO = any

const SUBDIVISIONS = 89
const radius = 25
const distance = 50 + 100 / SUBDIVISIONS
const FOV = 15;

const SCALE = 1;
const atmosphere_scale = 1.218
const WIREFRAME = false
const FLAT_SHADING = false
// const FLAT_TILES = true
const OUTLINES = false
const FLOOR = false

const moveSpeed = .05;
const rotationSpeed = 2;
const zoomSpeed = .5;


const makeEdgeGeometry = (geo: THREE.BufferGeometry) => new THREE.LineSegments(
	new THREE.EdgesGeometry(geo), 
	new THREE.LineBasicMaterial({ color: 0x080808 }));

const cartesianToSpherical = ({ x, y, z }: Vec3) => {
	const r = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.acos(z / r);
    const phi = Math.atan2(y, x);
    return { r, theta, phi };
}

const sphericalToCartesian = ({ r, theta, phi }: SphericalCoord) => {
	const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);
    return { x, y, z };
}

const cartesianToLatLon = ({ x, y, z }: Vec3) => {
    const r = Math.sqrt(x * x + y * y + z * z);
    const lat = Math.asin(z / r);
    const lon = Math.atan2(y, x);
    return { lat, lon };
}

const setVertexHeight = (height: number) => (vert: Vec3) => {
	const spherical = cartesianToSpherical(vert);
	spherical.r += height
	const { x, y, z } = sphericalToCartesian(spherical)
	return new THREE.Vector3(x, y, z)
}

const createFresnelMaterial = ({rimHex = 0x0088ff, facingHex = 0x000000} = {}) => {
	const uniforms = {
		color1: { value: new THREE.Color(rimHex) },
		color2: { value: new THREE.Color(facingHex) },
		fresnelBias: { value: 0.1 },
		fresnelScale: { value: 1.0 },
		fresnelPower: { value: 4.0 },
	};

	const vs = `
		uniform float fresnelBias;
		uniform float fresnelScale;
		uniform float fresnelPower;
		
		varying float vReflectionFactor;
		
		void main() {
		  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
		  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
		
		  vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
		
		  vec3 I = worldPosition.xyz - cameraPosition;
		
		  vReflectionFactor = fresnelBias + fresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), fresnelPower );
		
		  gl_Position = projectionMatrix * mvPosition;
		}`

	const fs = `
		uniform vec3 color1;
		uniform vec3 color2;
		
		varying float vReflectionFactor;
		
		void main() {
		  float f = clamp( vReflectionFactor, 0.0, 1.0 );
		  gl_FragColor = vec4(mix(color2, color1, vec3(f)), f);
		}`
		
	return new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: vs,
		fragmentShader: fs,
		transparent: true,
		blending: THREE.AdditiveBlending,
	})
}


const generateWorld = (n: number, r: number) => {
	console.log(`Generating Goldberg... n=${n}, r=${r}`)
	const ico = new THREE.IcosahedronGeometry(r, n);
	const tiles = groupFaces(ico);
	const blob = new Blob([toJson(tiles)], { type: 'application/json' })
	// saveAs(blob, `/geometries/goldberg_${n}_${r}.json`)
	return tiles
}


const getEarthColor = ({ lat, lon }: LatLon, ctx: TODO) => {
    const u = 1 - (lon + Math.PI) / (2 * Math.PI);
    const v = (lat + Math.PI / 2) / Math.PI;
    const x = Math.floor(u * ctx.canvas.width);
    const y = Math.floor(v * ctx.canvas.height);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
	const r = pixel[0];
	const g = pixel[1];
	const b = pixel[2];

    // Convert RGB to hex
    return (r << 16) | (g << 8) | b;
}

const rotateGeometry = (geo: ConvexGeometry & TODO) => {
	const rotMat1 = new THREE.Matrix4().makeRotationX(Math.PI / 2)
	geo.applyMatrix4(rotMat1)
	// const rotAxialTilt = new THREE.Matrix4().makeRotationZ(-23.4 * Math.PI / 180)
	// geo.applyMatrix4(rotAxialTilt)
	geo.vertsNeedUpdate = true
	return geo
}

const makeTileGeometry = (tile: Tile) => {
	const height = 5; //Math.random() * 1.5
	const verts = tile.vertices.map(setVertexHeight(height))
	const geo = rotateGeometry(new ConvexGeometry(verts))
	geo.computeVertexNormals()
	geo.castShadow = true
	geo.receiveShadow = true
	return geo 
}

const makeEarthMeshes = (tiles: Array<Tile>) => {
	const img = document.getElementById("projection") as HTMLImageElement
	const canvas = document.createElement('canvas')
	canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx?.drawImage(img, 0, 0, img.width, img.height)
	const earth = new THREE.Object3D()

	tiles.forEach(tile => {
		const geo = makeTileGeometry(tile)
		const coord = cartesianToLatLon(tile.centroid)
		const color = getEarthColor(coord, ctx)
		const material = new THREE.MeshStandardMaterial({
			color,
			flatShading: FLAT_SHADING,
			wireframe: WIREFRAME,
		});
	
		const mesh = new THREE.Mesh(geo, material)
		mesh.castShadow = true
		mesh.layers.enable(1)
		earth.add(mesh)
	
		if (OUTLINES) {
			earth.add(makeEdgeGeometry(geo))
		}
	})

	const geo2 = new THREE.SphereGeometry(radius, 80, 80); 
	const fresnelMat = createFresnelMaterial();
	const glowMesh = new THREE.Mesh(geo2, fresnelMat);
	glowMesh.scale.setScalar(atmosphere_scale);

	return {
		glowMesh, earth
	}
}


export const getEarth = (): Promise<{ earth?: THREE.Object3D, glowMesh?: THREE.Object3D }> =>
	fetch(`/geometries/goldberg_${SUBDIVISIONS}_${radius}.json`)
		.then(res => res.json())
		.then(data => data.map(({ center, vertices, facet, centroid }: Tile) => ({ 
			facet, center, centroid,
			vertices: vertices.map(v => new THREE.Vector3(...v)) 
		})))
		.catch(() => generateWorld(SUBDIVISIONS, radius))
		.then(tiles => makeEarthMeshes(tiles))
		.catch(error => {
			console.log(error)
			return {}
		})
