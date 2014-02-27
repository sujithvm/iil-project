#pragma strict

public static var inputString : String = "Enter sequence";
function Start () 
{
	DontDestroyOnLoad (this);
}

function Update () 
{

}
function OnGUI () 
{
		// Make a text field that modifies stringToEdit.
		inputString = GUI.TextField (Rect (10, 10, 200, 20), inputString, 25);
		
		if ( GUI.Button (Rect (10, 40, 200, 20),"ok")) {
			DontDestroyOnLoad (this);
			Application.LoadLevel("walkscene");
		}
}
function Awake () {
	DontDestroyOnLoad (this);
}