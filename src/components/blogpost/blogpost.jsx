import React, { useState, useEffect, useReducer } from 'react';
import Calendar from '../../components/calendar';
import bodyParse from '../bodyParse';
import './blogpost.css';

/*
	On change to isReading variable,
	blogpost element is mounted.
	Read from isReading state var to
	determine which blogpost's info
	to use, and whether reader has
	owner permissions to edit the post
	can put second failsafe in backend,
	if user requesting to update post
	doesnt have same id as post, 
	fail request
*/

function DeletePost ({apiAddr, userKey, postID, title, date, openDelete, backToBlogLog}) {

	userKey = userKey;
	postID = postID;
	const [deleteConfirmation, setConfirmation] = useReducer(state => !state, false);
	const deletePost = async(event) => {
		event.preventDefault();

		const response = await fetch(`${apiAddr}/posts/deletePost?id=${postID}`, {
			method: "DELETE",
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'auth-token': userKey
			}
		})

		let setIt = await response.json();
		setConfirmation(setIt);
		console.log(deleteConfirmation);
	}
	
	return (
		<div id="delete">

			{!deleteConfirmation &&
				<div id="alert">
					<span>operation:</span>
					<h2>Delete Post</h2>
					<h3>"{title}"</h3>
					<p>Posted on: {date}</p>

					<div id="optionsWrapper">
						<p>Are you sure you wish to delete this post?</p>
						<button onClick={openDelete}>Cancel</button>
						<button onClick={deletePost}>Delete Post</button>
					</div>
				</div>
			}
			{deleteConfirmation &&
				<div id="confirmed">
					<h2>It's Gone</h2>
					<button onClick={backToBlogLog}>Return</button>
				</div>
			}

		</div>
	)
}

export default function Blogpost({apiAddr, userKey, userID, isReading, set_isReading, userBlog, toggleMainMenu}) {

	// let dateFromObjectId = function (objectId) {
	// 	return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
	// };
	// let postDateInfo = dateFromObjectId(isReading.blogpostID);
	let postInfo = userBlog.log.find(post => post.id == isReading.blogpostID);
	let postID = postInfo._id;

	let dateInfo = new Date(postInfo.createdAt.slice(0, -1));
	let date = dateInfo.toString().slice(4, 15);

	let hour = dateInfo.toString().slice(16, 18);
	let minute = dateInfo.toString().slice(19, 21);
	let AoP;
	if(hour > 12) {
		AoP = 'pm';
		hour = hour - 12;
	} else {
		AoP = 'am';
	}
	let timestamp = hour+ ":" +minute+ " " +AoP;

	let title = postInfo.title;
	let tags = postInfo.tags.map((tag) => <li key="tag">{tag}</li>);
	//key should be tag.id while it's name is displayed
	//console is currently saying keys are the same?
	let id = postInfo._id;
	let owner = postInfo.owner;
	let content;
	if(postInfo.content.match(/\((.*?)\)/g)) {
		content = bodyParse(postInfo.content);
	} else {
		content = postInfo.content
	}

	let backToBlogLog = () => {
		set_isReading({
			...isReading,
			postOpen: false
		})
	}	

	const [revealInfo, setRevealInfo] = useReducer(state => !state, false);
	const [deleteOpen, openDelete] = useReducer(state => !state, false);
	/*
		09. 02. 2022
		Will need to use toggleMainMenu in functions for toggling edit and delete pages
	*/

	return (
		<article id='blogpost'>

			{deleteOpen &&
				<DeletePost 
					postID={postID}
					title={title}
					date={date}
					apiAddr={apiAddr}
					userKey={userKey}
					openDelete={openDelete}
					backToBlogLog={backToBlogLog}/>
			}


			<ul id="postDetails"> {/*has an onClick to open menu*/}
				<li id="toggle">
					<button onClick={setRevealInfo}>Post Details</button> {/*also has an onClick, but dissappears when open*/}
				</li>

				{revealInfo &&
					<ul id="info">
						<li>
							Entry Posted
						</li>
						<li>
							<span>{date}</span> &#64; <span>{timestamp}</span>
						</li>
						{/*use whitespace: pre-line for first span element in mobile*/}
						<li className="ownerControls">
							<button>Edit</button>
						</li>
						<li className="ownerControls"> 
							<button onClick={openDelete}>Delete</button>
						</li>
					</ul>
				}
			</ul>

			<h1>{postInfo.title}</h1>

			<p dangerouslySetInnerHTML={{ __html: content }}></p>

			<div id="metabox">
				<ul id="tags">
					{tags}
				</ul>
				<ul id="users">
					{/*dynamically add any tagged users here, if any*/}
				</ul>
			</div>

			<div id="menuWrapper">
				<button onClick={backToBlogLog}>Exit</button> 
				{/*just this, for now...*/}
			</div>

			{/*Will possibly create an outside function for comments, ITF (in the future)*/}


		</article> 
	)
}