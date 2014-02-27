
// Require a character controller to be attached to the same game object
@script RequireComponent(CharacterController)

public var idleAnimation     : AnimationClip;
public var walkAnimation     : AnimationClip;
public var jumpPoseAnimation : AnimationClip;

public var walkMaxAnimationSpeed : float = 0.75 ;
public var trotMaxAnimationSpeed : float = 1.0  ;
public var jumpAnimationSpeed    : float = 1.15 ;
public var landAnimationSpeed    : float = 1.0  ;

private var anim : Animation;

enum CharacterState {
	Idle = 0,
	Walking = 1,
	Trotting = 2,
	Jumping = 3,
}

private var characterState : CharacterState;

var walkSpeed = 2.0;				// The speed when walking
var trotSpeed = 4.0;				// after trotAfterSeconds of walking we trot with trotSpeed
var jumpHeight = 0.8;				// How high do we jump when pressing jump and letting go immediately
var gravity = 20.0;					// The gravity for the character
var speedSmoothing = 10.0;			// The gravity in controlled descent mode
var trotAfterSeconds = 3.0;			// trot after seconds
var canJump = true;					// jump posiible or not
var jumpTime = 0.3;
var walkTime = 1.0;

private var jumpRepeatTime = 0.05;			 // Jump repeat time
private var jumpTimeout = 0.15;				 // Jump time out
private var moveDirection = Vector3.right;	 // Current direction is right
private var verticalSpeed = 0.0;			 // The current vertical speed
private var moveSpeed = 0.5;				 // The current x-z move speed
private var collisionFlags : CollisionFlags; // The last collision flags returned from controller.Move
private var jumping = false;				 // Are we jumping? (Initiated with jump button and not grounded yet)
private var jumpingReachedApex = false;
private var isMoving = false;				 // Is the user pressing any keys?
private var walkTimeStart = 0.0;			 // When did the user start walking (Used for going into trot after a while)
private var lastJumpButtonTime = -10.0;		 // Last time the jump button was clicked down
private var lastJumpTime = -1.0;			 // Last time we performed a jump
private var lastJumpStartHeight = 0.0; 		 // the height we jumped from
private var inAirVelocity = Vector3.right;   //private var inAirVelocity = Vector3.zero;


private var ctr 	 : int = 0;
private var sequence : String ;
private var h = 0.0;
private var v = 0.0;
private var lastTime = 0.0;

function Awake ()
{
	// check if all requires (walk, idle and jump) animations are included	
	moveDirection = transform.TransformDirection(Vector3.forward);	
	anim = GetComponent(Animation);
	
	if(!anim || !idleAnimation || !walkAnimation || (!jumpPoseAnimation && canJump)) {
		anim = null;
		Debug.Log("Animation found. Turning off animations.");
	}
}

function Start()
{	
	// get game object
	var menuObject : GameObject = GameObject.Find("menuObject");
	// get input sequence of W and J
	sequence = menuObject.GetComponent(inputScript).inputString;
	// start and end with walk to prevent abrupt jump motions
	sequence = "W" + sequence +"W";
	// get animation associatess with game object here person
	anim = GetComponent(Animation);
}

function UpdateSmoothedMovementDirection ()
{
	var cameraTransform = Camera.main.transform;
	var grounded = IsGrounded();
	
	// Forward vector relative to the camera along the x-z plane	
	var forward = cameraTransform.TransformDirection(Vector3.forward);
	forward.y = 0;
	forward = forward.normalized;

	// Right vector relative to the camera
	// Always orthogonal to the forward vector
	var right = Vector3(forward.z, 0, -forward.x);

	
	var wasMoving = isMoving;
	isMoving = Mathf.Abs (h) > 0.1 || Mathf.Abs (v) > 0.1;
		
	// Target direction relative to the camera
	var targetDirection = h * right + v * forward;
	
	// Grounded controls
	if (grounded)
	{
		// Smooth the speed based on the current target direction
		var curSmooth = speedSmoothing * Time.deltaTime;
		
		// Choose target speed
		//* We want to support analog input but make sure you cant walk faster diagonally than just forward or sideways
		var targetSpeed = Mathf.Min(targetDirection.magnitude, 1.0);
	
		characterState = CharacterState.Idle;
		
		if (Time.time - trotAfterSeconds > walkTimeStart) {
			targetSpeed *= trotSpeed;
			characterState = CharacterState.Trotting;
		}
		else {
			targetSpeed *= walkSpeed;
			characterState = CharacterState.Walking;
		}
		
		moveSpeed = Mathf.Lerp(moveSpeed, targetSpeed, curSmooth);		
		// Reset walk time start when we slow down
		if (moveSpeed < walkSpeed * 0.3)
			walkTimeStart = Time.time;
	}	
}

function ApplyJumping ()
{
	// Prevent jumping too fast after each other
	if (lastJumpTime + jumpRepeatTime > Time.time)
		return;
	if (IsGrounded()) {
		// Jump
		if (canJump && Time.time < lastJumpButtonTime + jumpTimeout) {
			verticalSpeed = CalculateJumpVerticalSpeed (jumpHeight);
			SendMessage("DidJump", SendMessageOptions.DontRequireReceiver);
		}
	}
}

function ApplyGravity () 
{
	var jumpButton = true;
	// When we reach the apex of the jump we send out a message
	if (jumping && !jumpingReachedApex && verticalSpeed <= 0.0) {
		jumpingReachedApex = true;
		SendMessage("DidJumpReachApex", SendMessageOptions.DontRequireReceiver);
	}
	
	if (IsGrounded ())
		verticalSpeed = 0.0;
	else
		verticalSpeed -= gravity * Time.deltaTime;	
}

function CalculateJumpVerticalSpeed (targetJumpHeight : float)
{
	// From the jump height and gravity we deduce the upwards speed 
	// for the character to reach at the apex.
	return Mathf.Sqrt(2 * targetJumpHeight * gravity);
}

function DidJump ()
{
	jumping = true;
	jumpingReachedApex = false;
	lastJumpTime = Time.time;
	lastJumpStartHeight = transform.position.y;
	lastJumpButtonTime = -10;	
	characterState = CharacterState.Jumping;
}

function Update() 
{	
	if ( ctr < sequence.length)
	{
		if (sequence[ctr] == 'J') {
			lastJumpButtonTime = Time.time;
			h = 0;
		}
		else 
			h = 0.5;
			
		if (sequence[ctr] == 'J' && Time.time - lastTime >= 0.3) {
			ctr++;
			lastTime = Time.time;
		}
		else if (sequence[ctr] == 'W' && Time.time - lastTime >= 1.0) {
			ctr++;
			lastTime = Time.time;
		}			
			
		UpdateSmoothedMovementDirection();		
		ApplyGravity ();
		ApplyJumping ();
		
		// Calculate actual motion
		var movement = moveDirection * moveSpeed + Vector3 (0, verticalSpeed, 0) + inAirVelocity;
		movement *= Time.deltaTime;		
		// Move the controller
		var controller : CharacterController = GetComponent(CharacterController);
		collisionFlags = controller.Move(movement);
		
		// ANIMATION sector
		if(anim) {
			if(characterState == CharacterState.Jumping) 
			{
				if(!jumpingReachedApex) {
					anim[jumpPoseAnimation.name].speed = jumpAnimationSpeed;
					anim[jumpPoseAnimation.name].wrapMode = WrapMode.ClampForever;
					anim.CrossFade(jumpPoseAnimation.name);
				} else {
					anim[jumpPoseAnimation.name].speed = -landAnimationSpeed;
					anim[jumpPoseAnimation.name].wrapMode = WrapMode.ClampForever;
					anim.CrossFade(jumpPoseAnimation.name);				
				}
			} 
			else 
			{
				if(characterState == CharacterState.Trotting) {
					anim[walkAnimation.name].speed = Mathf.Clamp(controller.velocity.magnitude, 0.0, trotMaxAnimationSpeed);
					anim.CrossFade(walkAnimation.name);	
				}
				else if(characterState == CharacterState.Walking) {
					anim[walkAnimation.name].speed = Mathf.Clamp(controller.velocity.magnitude, 0.0, walkMaxAnimationSpeed);
					anim.CrossFade(walkAnimation.name);	
					
				}				
			}
		}			
		// was in jump mode but just became grounded
		if (IsGrounded())
		{			
			//inAirVelocity = Vector3.zero;
			inAirVelocity = Vector3.right;
			if (jumping) {
				jumping = false;
				SendMessage("DidLand", SendMessageOptions.DontRequireReceiver);
			}
		}
	}
	else {
		animation.Stop();
	}
}

function IsGrounded () 
{
	return (collisionFlags & CollisionFlags.CollidedBelow) != 0;
}
