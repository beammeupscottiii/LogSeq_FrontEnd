/* * * V I T A L S * * */
import * as React from 'react';
import {useParams, useLocation} from 'react-router-dom';
import Calendar from '../calendar'
import APIaccess from '../../apiaccess';
import bodyParse from '../bodyParse';
import './blog.css';

/* * * C O M P O N E N T S * * */
import Header from '../../components/home/header';
import Instant from '../../components/instants/instant';
import InteractionsList from '../../components/instants/interactionsList';

const accessAPI = APIaccess(); 



export default function Post({
	socketURL, 
	socketMessage, 
	setSocketMessage, 
	sendMessage, 
	isActive,
	setActive, 
	accessID, 
	setAccessID,
	unreadCount,
	setUnreadCount,
	getUnreadCount
}) {

	/**
	 * postTitle
	 * post.tags.map((tag) => <li key={tag}>{tag}</li>)
	 * post._id
	 * post.owner
	 * post.content.map
	 */
	
	/**
	 * Discerns source of blog post data and uses it
	 */
	let { postID } = useParams();
	let	location = useLocation();
	let [postData, setPostData] = React.useState(location.state.post);
	let [comments, setComments] = React.useState([]);

	let getComments = async() => {

		let id = postData._id;
		let body = {parentID: postData._id};
		let cmnts = await accessAPI.postComment('getAll', id, body);

		await Promise.all(
			cmnts.map(async (comment) => {
				let id = comment._id;
				let body = {parentID: comment._id};
				let replies = await accessAPI.postComment('getAll', id, body);
				
				comment.replies = replies;
				
				if(replies.replies) {
					getComments(replies)
				} else {
					return;
				}
			})
		)
		/*
			recursively count all comments, 
			send count to backEnd to update post's commentCount

			uncomment with 1.0A
		*/
		// let cmntcount = 0;
		// let countComments = (comments) => {
		// 	for(let cmnt of comments) {
		// 		cmntcount++;
		// 		countComments(cmnt.replies)
		// 	}
		// 	return cmntcount;
		// }
		// await accessAPI.updateCommentCount(id, cmntcount).then((res) => {
		// 	setPostData({
		// 		...postData,
		// 		commentCount: cmntcount
		// 	})
		// })
		// console.log(countComments(cmnts));
		setComments(cmnts);
	};
	let getPost = async() => {
		let post = await accessAPI.getBlogPost(postID);
		setPostData(post);
		setTimeout(()=> {
			getComments(postData.comments);
		}, 500)
	};
	/*** updates comments on initial load and page refresh ***/
	React.useEffect(()=> {
		getComments(postData.comments);
	}, [])

	/***
	 	P o s t D e t a i l s
	***/
	let cal = Calendar();
	let dateInfo = new Date(postData.createdAt.slice(0, -1));
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
	let timeStamp = hour+ ":" +minute+ " " +AoP;

	let userID = sessionStorage.getItem('userID');
	let userName = sessionStorage.getItem('userName');
	let isOwner = postData.owner == userID ? true : false;

	//to be removed once old posts gone
	let content, split;
	let text = [];
	if( Object.keys(postData.content[0]).length > 10 ) {

		for (let char in postData.content[0]) {
			text.push(postData.content[0][char]);
		}
		text = text.join("");
		split = true;
		// console.log(text)
	} else if ( Object.keys(postData.content[0].length < 10)) {
		content = postData.content;
		split = false;
	}


	/*** 
	  	C o m p o n e n t  F u n c t i o n a l i t y
	***/
	const [notifList, setNotifList] = React.useReducer(state => !state, false);
	const [toggleDetails, openDetails] = React.useReducer(state => !state, false);
	const [isOptionsOpen, toggleOptions] = React.useReducer(state => !state, false);
	const [isComment, toggleComment] = React.useReducer(state => !state, false);
	const [messageContent, setMessage] = React.useState('');
	const [access, setAccess] = React.useState({
		type: null, //"initial" or "response"
		commentID: null, 
		commentNumber: null,
		commentOwner: null //owner id
	})
	let optionsButton = React.useRef();

	let handleMessage = (e) => {
		setMessage(e.target.value);
	}
	let handleSubmit = async(e) => {
		e.preventDefault();
		let date = new Date();
		let body = {
			ownerUsername: userName,
			ownerID: userID,
			content: messageContent,
			postedOn_month: date.getMonth() + 1,
			postedOn_day: date.getDate(),
			postedOn_year: date.getFullYear(),
			commentNumber: access.commentNumber,
		}

		let notif = {
				type: 'comment',
				isRead: false,
				senderID: userID,
				senderUsername: userName,
				postURL: postID,
				recipients: [postData.owner],
				details: JSON.stringify({postTitle: postData.title})
		}

		if(access.type == 'initial') {

			body.parentID = postID;
			notif.message = 'initial';

		} else if (access.type == 'response') {

			body.parentID = access.commentID;
			if(access.commentOwner == userID) {
				//removes post owner from notifList if user responds to their own comment
				notif.recipients.shift(); 
			}
			if(postData.owner != access.commentOwner) {
				notif.recipients.push(access.commentOwner);
			}
			notif.message = 'response';
		}

		let notifID;
		let request = await accessAPI.postComment(access.type, postID, body).then(res => {
			console.log(res)
			notif.details = JSON.stringify({
				postTitle: postData.title,
				commentID: res
			});
			setSocketMessage(notif);
			console.log(notif)
			getComments();
		})

		console.log(request);
		toggleComment();
		toggleOptions();
	}

	let createComment = (comment) => {

		let date = `${comment.postedOn_month}. ${comment.postedOn_day}. ${comment.postedOn_year}`;
		let element = 
			<li className="comment" key={comment._id} id={comment._id}>
				
				<h3>{comment.ownerUsername} @ {date}</h3>
				<p>{comment.content}</p>

				<button className="buttonDefault"
						onClick={()=> {

							setAccess({
								type: 'response',
								commentID: comment._id,
								commentNumber: `${comment.commentNumber} - ${comment.replies.length + 1}`,
								commentOwner: comment.ownerID
							});

							toggleComment()
				}}>Reply</button>

				{comment.replies &&
					<ul>
						{comment.replies.map(comment => (
							createComment(comment)
						))}
					</ul>
				}

			</li>
		return element;
	}


	/*
		If user visits page via notif concerning comment
	*/

	let commentsRef = React.useRef()
	let commentsCurrent = commentsRef.current;

	React.useEffect(()=> {
		if(commentsCurrent) {
			if(accessID.commentID) {
				let comment = document.getElementById(accessID.commentID);
				console.log(comment);
				comment.scrollIntoView({behavior: "smooth"});
				/* can add class to comment to make it stand out...*/
			}
		}	
	}, [comments, commentsCurrent])

	// console.log(accessID)

	return (
		<section id="POST">
			<Header cal={cal} isPost={true} setNotifList={setNotifList} unreadCount={unreadCount}/>

			<article>

				<button id="open" onClick={openDetails}>Post Details</button>
				<div id="details" className={toggleDetails ? "open" : ""}>

					<h4>Entry Posted On</h4>
					<p>{date} @ {timeStamp} UTC</p>

					<ul id="options">
						{isOwner &&
							<li>
								<button>EDIT</button>
							</li>
						}
						{isOwner &&
							<li>
								<button>DELETE</button>
							</li>
						}
						{!isOwner &&
							<li>
								<button>REPORT</button>
							</li>
						}

					</ul>
				</div>


				{/* * * M A I N   C O N T E N T * * */}
				<div id="mainContent">

					{!isOwner &&
						<h4>{postData.author}</h4>
					}	
					<h2>{postData.title}</h2>

					{/*Would have ul with map of tagged users*/}

					{split &&
						<p>{text}</p>
					}
					{!split &&
						content.map((data) => {
								if(data.type == 'text') {
									if(data.content.match(/\((.*?)\)/g)) {
										return (<p dangerouslySetInnerHTML={{ __html: bodyParse(data.content)}} key={data.place}></p>)
									} else {
										return (<p dangerouslySetInnerHTML={{ __html: data.content}} key={data.place}></p>)
									}
								} else if(data.type == 'media') {
									return <img src={data.content}/>
								}
							}
						)
					}

					{/*Here would be a div wrapper for the tags*/}
				</div>


				<div id="commentsWrapper">
					<h2>Comments</h2>

					<ul id="commentBox" ref={commentsRef}>
						{comments.map(comment => (
							createComment(comment)
						))}
					</ul>

				</div>
			</article>

			<div id='optionsBar'>
				<button id="optionsToggle"className="buttonDefault" ref={optionsButton} onClick={toggleOptions}>OPTIONS</button>

				{isOptionsOpen &&
					<ul id="options">
						<li>
							<button className="buttonDefault" onClick={()=> {
								toggleComment(); 
								console.log(comments.length)
								setAccess({
									type: 'initial',
									commentNumber: `${comments.length + 1}`
								})

							}}>Comment</button>
						</li>
						<li>
							<button className="buttonDefault">Exit Post</button>
						</li>
						<li>
							<button className="buttonDefault" onClick={toggleOptions}>x</button>
						</li>
					</ul>
				}
				

				{isComment &&
					<form onSubmit={handleSubmit}>
						<h3>Comment #{access.commentNumber}</h3>
						<textarea name="content" rows="10" onChange={handleMessage}></textarea>

						<div id="buttonBox">
							<button className="buttonDefault" onClick={toggleComment}>Close</button>
							<button className="buttonDefault" type="submit">Submit</button>
						</div>
					</form>
				}
			</div>
			

			{notifList &&
	          <InteractionsList 
	            setNotifList={setNotifList} 
	            unreadCount={unreadCount}
	            setUnreadCount={setUnreadCount}
	            setSocketMessage={setSocketMessage}/>
	        }
			<Instant 
				socketURL={socketURL}
                socketMessage={socketMessage}
                setSocketMessage={setSocketMessage}
                sendMessage={sendMessage}
                isActive={isActive}
                setActive={setActive}
                accessID={accessID}
                setAccessID={setAccessID}
                getUnreadCount={getUnreadCount}
			/>
		</section>
	)

}