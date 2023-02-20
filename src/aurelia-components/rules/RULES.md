


Rule types
* filter
* math
* extract
* distance
* projection
* if
* normal distance
* reducer

```ts
export type RuleIOType = 'scene' | 'three-objects' | 'three-object' | 'triangles' | 'triangle' | 'line3s' | 'line3' | 'vector3s' | 'vector3' | 'vector2s' | 'vector2' | 'box3s' | 'box3' | 'strings' | 'string' | 'numbers' | 'number' | 'booleans' | 'boolean' | 'json';

export type RuleIOTypeValue<RuleIOType> = THREE.Scene | THREE.Object3D[] | THREE.Object3D | THREE.Triangle | THREE.Triangle[] | THREE.Line3 | THREE.Line3[] | THREE.Vector3 | THREE.Vector3[] | THREE.Vector2 | THREE.Vector2[] | THREE.Box3 | THREE.Box3[] | string[] | string | number[] | number | boolean[] | boolean | CheckerJsonOutput[];

export type RuleIOTypeScene<'scene'> = THREE.Scene;

```


export type CheckerModuleIOTypeValue = ;


Use Case FM

Nb de collaborateur pour un étage
* - filtre par collaborateur
* - filtre par étage (ex no 2)
* - somme des collaborateur
* - récupérer l'étage (type sol, étage 2)
* - écrire la somme dans mon étage dans userData.nbCollaborateur

(bis) Il manque des bouts pour faire ça
* - filtrer les étages => enregistrer [etages]
* - filtrer les collaborateurs => enregister
* - (reducer) grouper les collaborateur par étage
* - somme des collaborateur / étage
* - écrire 

Trouve moi les étages où il n'y a pas de collaborateur pompier
* - filter par collaborateur
* - filtre par étage
* - filtre est pompier
* - total
* - total === 0



Rule qui boucle sur des objets pour faire des process
- Filtre les étages
- Boucle => sur les objets du filtre précédent
  - Démarrer process (nb collaborateur / étage) pour chaque étage



Il faut aussi une rule de type ApplyStyle
* input d'un ou plusieurs objets pour le style
* input d'une ou plusieurs valeurs de style

Il faut aussi une rule pour créer un nouvel objet
* pour l'affichage d'une distance entre deux objets par exemple



